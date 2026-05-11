using LiquidAudioPlayer.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Interop;
using Forms = System.Windows.Forms;

namespace LiquidAudioPlayer;

public partial class MainWindow : Window, INotifyPropertyChanged
{
    private static readonly HashSet<string> SupportedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".aac",
        ".aiff",
        ".alac",
        ".flac",
        ".m4a",
        ".mp3",
        ".ogg",
        ".opus",
        ".wav",
        ".wma"
    };

    private readonly HashSet<string> _importedPaths = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, FrameworkElement> _pages;
    private readonly Dictionary<string, ToggleButton> _navItems;
    private bool _isFullscreen;
    private string _importStatus = "Import individual songs or scan a folder to build your local library.";
    private string _searchText = string.Empty;
    private Rect _windowedBounds;
    private WindowState _windowedState;

    public event PropertyChangedEventHandler? PropertyChanged;

    public ObservableCollection<MusicTrack> ImportedTracks { get; } = [];
    public ObservableCollection<MusicTrack> RecentTracks { get; } = [];
    public ICollectionView FilteredTracks { get; }

    public string HeroSubtitle => LatestTrack is null
        ? "Import files and this panel becomes the staging surface for your newest music."
        : $"{LatestTrack.Artist} - {LatestTrack.Album}";

    public string HeroTitle => LatestTrack?.Title ?? "A place for your sound";
    public string ImportStatus
    {
        get => _importStatus;
        private set
        {
            if (_importStatus == value)
            {
                return;
            }

            _importStatus = value;
            OnPropertyChanged();
        }
    }

    public string ImportedTrackCountText => ImportedTracks.Count.ToString("N0");
    public string LibraryFormatCountText => ImportedTracks.Select(track => track.Format).Distinct(StringComparer.OrdinalIgnoreCase).Count().ToString("N0");
    public Visibility LibraryEmptyVisibility => ImportedTracks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    public Visibility RecentEmptyVisibility => RecentTracks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    public Visibility RecentListVisibility => RecentTracks.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
    public string RecentTrackCountText => RecentTracks.Count.ToString("N0");
    public string SignalSubtitle => LatestTrack is null ? "Ready for imports" : $"{LatestTrack.Format} - {LatestTrack.SizeLabel}";
    public string SignalTitle => LatestTrack?.Title ?? "Aurora Lossless";
    public Visibility TrackListVisibility => ImportedTracks.Count == 0 ? Visibility.Collapsed : Visibility.Visible;

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (_searchText == value)
            {
                return;
            }

            _searchText = value;
            OnPropertyChanged();
            FilteredTracks.Refresh();
        }
    }

    private MusicTrack? LatestTrack => RecentTracks.FirstOrDefault();

    public MainWindow()
    {
        InitializeComponent();

        FilteredTracks = CollectionViewSource.GetDefaultView(ImportedTracks);
        FilteredTracks.Filter = FilterTrack;
        DataContext = this;

        _pages = new Dictionary<string, FrameworkElement>
        {
            ["Home"] = HomePage,
            ["Library"] = LibraryPage,
            ["Recents"] = RecentsPage,
            ["Settings"] = SettingsPage
        };

        _navItems = new Dictionary<string, ToggleButton>
        {
            ["Home"] = HomeNav,
            ["Library"] = LibraryNav,
            ["Recents"] = RecentsNav,
            ["Settings"] = SettingsNav
        };

        Navigate("Home");
    }

    private void ImportButton_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new Microsoft.Win32.OpenFileDialog
        {
            Title = "Import music",
            Filter = "Audio files|*.aac;*.aiff;*.alac;*.flac;*.m4a;*.mp3;*.ogg;*.opus;*.wav;*.wma|All files|*.*",
            Multiselect = true
        };

        if (dialog.ShowDialog(this) == true)
        {
            ImportFiles(dialog.FileNames);
        }
    }

    private void ScanButton_Click(object sender, RoutedEventArgs e)
    {
        using var dialog = new Forms.FolderBrowserDialog
        {
            Description = "Choose a folder to scan for music",
            ShowNewFolderButton = false,
            UseDescriptionForTitle = true
        };

        if (dialog.ShowDialog() != Forms.DialogResult.OK)
        {
            return;
        }

        try
        {
            IEnumerable<string> files = Directory
                .EnumerateFiles(dialog.SelectedPath, "*.*", SearchOption.AllDirectories)
                .Where(IsSupportedAudioFile);

            ImportFiles(files);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            ImportStatus = $"Couldn't scan that folder: {ex.Message}";
        }
    }

    private void ImportFiles(IEnumerable<string> filePaths)
    {
        int importedCount = 0;

        foreach (string path in filePaths.Where(IsSupportedAudioFile))
        {
            string fullPath = Path.GetFullPath(path);
            if (!_importedPaths.Add(fullPath))
            {
                continue;
            }

            var track = new MusicTrack(fullPath);
            ImportedTracks.Add(track);
            RecentTracks.Insert(0, track);
            importedCount++;

            while (RecentTracks.Count > 24)
            {
                RecentTracks.RemoveAt(RecentTracks.Count - 1);
            }
        }

        if (importedCount == 0)
        {
            ImportStatus = "No new supported music files found.";
            RefreshImportState();
            return;
        }

        string noun = importedCount == 1 ? "track" : "tracks";
        ImportStatus = $"Imported {importedCount:N0} {noun}.";
        RefreshImportState();
        Navigate("Library");
    }

    private bool FilterTrack(object item)
    {
        if (item is not MusicTrack track)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(SearchText))
        {
            return true;
        }

        return track.Title.Contains(SearchText, StringComparison.OrdinalIgnoreCase)
            || track.Artist.Contains(SearchText, StringComparison.OrdinalIgnoreCase)
            || track.Album.Contains(SearchText, StringComparison.OrdinalIgnoreCase)
            || track.Format.Contains(SearchText, StringComparison.OrdinalIgnoreCase)
            || track.FileName.Contains(SearchText, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSupportedAudioFile(string path)
    {
        return SupportedExtensions.Contains(Path.GetExtension(path));
    }

    private void RefreshImportState()
    {
        FilteredTracks.Refresh();
        OnPropertyChanged(nameof(HeroSubtitle));
        OnPropertyChanged(nameof(HeroTitle));
        OnPropertyChanged(nameof(ImportedTrackCountText));
        OnPropertyChanged(nameof(LibraryEmptyVisibility));
        OnPropertyChanged(nameof(LibraryFormatCountText));
        OnPropertyChanged(nameof(RecentEmptyVisibility));
        OnPropertyChanged(nameof(RecentListVisibility));
        OnPropertyChanged(nameof(RecentTrackCountText));
        OnPropertyChanged(nameof(SignalSubtitle));
        OnPropertyChanged(nameof(SignalTitle));
        OnPropertyChanged(nameof(TrackListVisibility));
    }

    private void NavItem_Click(object sender, RoutedEventArgs e)
    {
        if (sender is ToggleButton { Tag: string pageName })
        {
            Navigate(pageName);
        }
    }

    private void Navigate(string pageName)
    {
        foreach (FrameworkElement page in _pages.Values)
        {
            page.Visibility = Visibility.Collapsed;
        }

        foreach (ToggleButton navItem in _navItems.Values)
        {
            navItem.IsChecked = false;
        }

        if (!_pages.TryGetValue(pageName, out FrameworkElement? selectedPage))
        {
            return;
        }

        selectedPage.Visibility = Visibility.Visible;
        _navItems[pageName].IsChecked = true;
        CurrentPageTitle.Text = pageName;
        CurrentPageEyebrow.Text = pageName.ToUpperInvariant();
    }

    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2)
        {
            ToggleMaximized();
            return;
        }

        if (e.LeftButton == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeButton_Click(object sender, RoutedEventArgs e)
    {
        ToggleFullscreen();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void ToggleMaximized()
    {
        if (_isFullscreen)
        {
            ToggleFullscreen();
            return;
        }

        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private void ToggleFullscreen()
    {
        if (_isFullscreen)
        {
            Topmost = false;
            WindowState = WindowState.Normal;
            Left = _windowedBounds.Left;
            Top = _windowedBounds.Top;
            Width = _windowedBounds.Width;
            Height = _windowedBounds.Height;

            if (_windowedState == WindowState.Maximized)
            {
                WindowState = WindowState.Maximized;
            }

            _isFullscreen = false;
            return;
        }

        _windowedState = WindowState;
        if (WindowState == WindowState.Maximized)
        {
            WindowState = WindowState.Normal;
        }

        _windowedBounds = new Rect(Left, Top, Width, Height);
        Forms.Screen screen = Forms.Screen.FromHandle(new WindowInteropHelper(this).Handle);
        Left = screen.Bounds.Left;
        Top = screen.Bounds.Top;
        Width = screen.Bounds.Width;
        Height = screen.Bounds.Height;
        Topmost = true;
        _isFullscreen = true;
    }

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
