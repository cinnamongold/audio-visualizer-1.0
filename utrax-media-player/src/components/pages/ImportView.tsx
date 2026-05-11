import React, { useState, useRef } from 'react';
import { Upload, FolderPlus, Download, ExternalLink, Music, Clock, HardDrive, FileAudio } from 'lucide-react';
import parseAudioMetadata from 'parse-audio-metadata';
import { usePlayer } from '../../context/PlayerContext';
import { PageId, Track } from '../../types';

export default function ImportView({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  const { addTracks } = usePlayer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [stats, setStats] = useState({ length: 0, size: 0, count: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<Track | null> => {
    try {
      const metadata = await parseAudioMetadata(file);
      
      let coverUrl: string | null = null;
      if (metadata.picture) {
        try {
          if (metadata.picture instanceof Blob || metadata.picture instanceof File) {
            coverUrl = URL.createObjectURL(metadata.picture);
          } else if (metadata.picture.data || metadata.picture.buffer) {
             const buf = metadata.picture.data || metadata.picture.buffer || metadata.picture;
             const type = metadata.picture.format || metadata.picture.type || 'image/jpeg';
             coverUrl = URL.createObjectURL(new Blob([buf], { type }));
          }
        } catch(e) {
          console.error("Cover art parsing error", e);
        }
      }

      return {
        id: file.name + file.lastModified,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: metadata.artist || "Unknown Artist",
        album: metadata.album || "Unknown Album",
        year: metadata.year || metadata.date ? parseInt(metadata.year || metadata.date || "0", 10) : undefined,
        coverUrl,
        file,
        duration: metadata.duration
      };
    } catch (error) {
      console.warn('Metadata error:', error);
      return {
        id: file.name + file.lastModified,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        album: "Unknown Album",
        coverUrl: null,
        file,
      };
    }
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Filter audio files only
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|flac|m4a|ogg|aac)$/i));
    if (audioFiles.length === 0) return;

    setIsProcessing(true);
    let totalDuration = 0;
    let totalSize = 0;
    const newTracks: Track[] = [];

    for (const file of audioFiles) {
      const track = await processFile(file);
      if (track) {
        newTracks.push(track);
        totalSize += file.size;
        if (track.duration) totalDuration += track.duration;
      }
    }

    addTracks(newTracks);
    setStats(prev => ({
      length: prev.length + totalDuration,
      size: prev.size + totalSize,
      count: prev.count + newTracks.length
    }));
    setIsProcessing(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(e.target.files || []));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <header className="mb-10 shrink-0">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Import Library</h1>
        <p className="text-white/50">Add local audio files to your player</p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col xl:flex-row gap-8 content-start">
        {/* Import Controls */}
        <div className="flex-1 flex flex-col gap-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-48 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/10 hover:border-blue-400/50 rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          >
            <Upload size={32} className="text-white/40 group-hover:text-blue-400 mb-4 transition-colors" />
            <h3 className="text-lg font-bold text-white mb-1">Select Files</h3>
            <p className="text-sm text-white/40">Click to browse your device</p>
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-[32px] backdrop-blur-sm">
               <p className="text-white font-medium text-sm flex items-center gap-2">
                 Supported: <span className="text-blue-400">MP3, WAV, FLAC, M4A, OGG</span>
               </p>
            </div>
            <input type="file" ref={fileInputRef} multiple accept="audio/*" className="hidden" onChange={onFileChange} />
          </div>

          <div 
            onClick={() => folderInputRef.current?.click()}
            className="group h-48 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
             <FolderPlus size={32} className="text-white/40 group-hover:text-blue-400 mb-4 transition-colors relative z-10" />
             <h3 className="text-lg font-bold text-white mb-1 relative z-10">Scan Folder</h3>
             <p className="text-sm text-white/40 relative z-10">Extract tracks and info from a directory</p>
             <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             {/* Note: React doesn't officially support 'webkitdirectory' and 'directory' in types but it works in the DOM */}
             <input type="file" ref={folderInputRef} {...{webkitdirectory: "true", directory: "true"} as any} className="hidden" onChange={onFileChange} />
          </div>
        </div>

        {/* Info & External Services */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FileAudio className="text-blue-400" size={20} /> Upload Session Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <Music className="text-white/40 mb-2" size={16} />
                <div className="text-2xl font-bold text-white tabular-nums">{stats.count}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mt-1">Tracks Imported</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                <Clock className="text-white/40 mb-2" size={16} />
                <div className="text-2xl font-bold text-white tabular-nums">{formatDuration(stats.length)}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mt-1">Total Length</div>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 col-span-2 flex items-center justify-between">
                 <div>
                   <HardDrive className="text-white/40 mb-2" size={16} />
                   <div className="text-2xl font-bold text-white tabular-nums">{formatSize(stats.size)}</div>
                   <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mt-1">Storage Processed</div>
                 </div>
                 {isProcessing && (
                   <div className="flex items-center gap-3">
                     <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                     <span className="text-blue-400 text-sm font-medium animate-pulse">Processing...</span>
                   </div>
                 )}
              </div>
            </div>
            {stats.count > 0 && !isProcessing && (
              <button 
                onClick={() => onNavigate('library')}
                className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
              >
                Go to Library
              </button>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => onNavigate('download')}
              className="w-full h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 rounded-2xl flex items-center justify-center gap-3 text-white font-bold transition-all group"
            >
              <Download size={20} className="group-hover:scale-110 transition-transform" /> Download Some Music!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
