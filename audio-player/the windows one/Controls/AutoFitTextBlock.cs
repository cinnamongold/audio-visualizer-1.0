using System;
using System.ComponentModel;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace LiquidAudioPlayer.Controls;

public class AutoFitTextBlock : TextBlock
{
    public static readonly DependencyProperty MinFontSizeProperty =
        DependencyProperty.Register(
            nameof(MinFontSize),
            typeof(double),
            typeof(AutoFitTextBlock),
            new PropertyMetadata(10d, OnFitPropertyChanged));

    public static readonly DependencyProperty MaxFontSizeProperty =
        DependencyProperty.Register(
            nameof(MaxFontSize),
            typeof(double),
            typeof(AutoFitTextBlock),
            new PropertyMetadata(double.NaN, OnFitPropertyChanged));

    private bool _isFitting;

    public double MinFontSize
    {
        get => (double)GetValue(MinFontSizeProperty);
        set => SetValue(MinFontSizeProperty, value);
    }

    public double MaxFontSize
    {
        get => (double)GetValue(MaxFontSizeProperty);
        set => SetValue(MaxFontSizeProperty, value);
    }

    public AutoFitTextBlock()
    {
        TrackProperty(TextProperty);
        TrackProperty(FontFamilyProperty);
        TrackProperty(FontWeightProperty);
        TrackProperty(FontStyleProperty);
        TrackProperty(FontStretchProperty);
        TrackProperty(ForegroundProperty);
        TrackProperty(TextWrappingProperty);
        Loaded += (_, _) => QueueFit();
    }

    protected override void OnRenderSizeChanged(SizeChangedInfo sizeInfo)
    {
        base.OnRenderSizeChanged(sizeInfo);
        QueueFit();
    }

    private static void OnFitPropertyChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is AutoFitTextBlock textBlock)
        {
            textBlock.QueueFit();
        }
    }

    private void QueueFit()
    {
        if (_isFitting || !IsLoaded)
        {
            return;
        }

        Dispatcher.BeginInvoke(FitText, DispatcherPriority.Render);
    }

    private void FitText()
    {
        if (_isFitting || ActualWidth <= 0 || string.IsNullOrWhiteSpace(Text))
        {
            return;
        }

        _isFitting = true;

        double targetHeight = ActualHeight > 0 ? ActualHeight : double.PositiveInfinity;
        double maxFontSize = double.IsNaN(MaxFontSize) ? FontSize : MaxFontSize;
        double minFontSize = Math.Max(1, MinFontSize);
        double fittedSize = Math.Max(minFontSize, maxFontSize);

        for (double size = fittedSize; size >= minFontSize; size -= 0.5)
        {
            FormattedText measurement = CreateMeasurement(size);
            if (measurement.Width <= ActualWidth + 0.5 && measurement.Height <= targetHeight + 0.5)
            {
                fittedSize = size;
                break;
            }
        }

        FontSize = fittedSize;
        _isFitting = false;
    }

    private FormattedText CreateMeasurement(double fontSize)
    {
        double pixelsPerDip = VisualTreeHelper.GetDpi(this).PixelsPerDip;
        var typeface = new Typeface(FontFamily, FontStyle, FontWeight, FontStretch);
        var measurement = new FormattedText(
            Text,
            CultureInfo.CurrentUICulture,
            FlowDirection,
            typeface,
            fontSize,
            Foreground,
            pixelsPerDip);

        if (TextWrapping != TextWrapping.NoWrap)
        {
            measurement.MaxTextWidth = Math.Max(1, ActualWidth);
        }

        return measurement;
    }

    private void TrackProperty(DependencyProperty property)
    {
        DependencyPropertyDescriptor
            .FromProperty(property, typeof(TextBlock))
            ?.AddValueChanged(this, (_, _) => QueueFit());
    }
}
