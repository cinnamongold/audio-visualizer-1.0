using System;
using System.IO;

namespace LiquidAudioPlayer.Models;

public sealed class MusicTrack
{
    public MusicTrack(string filePath)
    {
        FilePath = filePath;
        FileName = Path.GetFileName(filePath);
        Format = Path.GetExtension(filePath).TrimStart('.').ToUpperInvariant();
        Album = Directory.GetParent(filePath)?.Name ?? "Imported";
        ImportedAt = DateTime.Now;

        string name = Path.GetFileNameWithoutExtension(filePath);
        string[] parts = name.Split(" - ", 2, StringSplitOptions.TrimEntries);
        if (parts.Length == 2)
        {
            Artist = string.IsNullOrWhiteSpace(parts[0]) ? "Unknown Artist" : parts[0];
            Title = string.IsNullOrWhiteSpace(parts[1]) ? name : parts[1];
        }
        else
        {
            Artist = "Unknown Artist";
            Title = string.IsNullOrWhiteSpace(name) ? FileName : name;
        }

        var fileInfo = new FileInfo(filePath);
        SizeLabel = fileInfo.Exists ? $"{fileInfo.Length / 1024d / 1024d:0.0} MB" : "Local";
        ImportedLabel = ImportedAt.ToString("MMM d, h:mm tt");
        Initials = BuildInitials(Title);
    }

    public string Album { get; }
    public string Artist { get; }
    public string FileName { get; }
    public string FilePath { get; }
    public string Format { get; }
    public string ImportedLabel { get; }
    public DateTime ImportedAt { get; }
    public string Initials { get; }
    public string SizeLabel { get; }
    public string Title { get; }

    private static string BuildInitials(string value)
    {
        string[] words = value.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (words.Length == 0)
        {
            return "??";
        }

        if (words.Length == 1)
        {
            return words[0][..Math.Min(2, words[0].Length)].ToUpperInvariant();
        }

        return string.Concat(words[0][0], words[1][0]).ToUpperInvariant();
    }
}
