import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, List, Library } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { PageId } from '../types';

export default function PlayerBar({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious, audioRef, settings, isShuffle, toggleShuffle } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);

    if (isPlaying) {
      audio.play().catch(e => console.error(e));
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [isPlaying, currentTrack, audioRef]);

  const togglePlay = () => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <footer className="h-24 bg-white/5 backdrop-blur-3xl border border-white/20 rounded-[32px] flex items-center px-10 shadow-2xl relative z-10">
      {/* Now Playing */}
      <div className="flex items-center gap-4 w-1/4 min-w-0 pr-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br flex-shrink-0 from-indigo-500 to-blue-700 shadow-xl border border-white/30 flex items-center justify-center text-white/40 overflow-hidden">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <MusicIcon size={24} />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate text-white">
            {currentTrack ? currentTrack.title : "Not Playing"}
          </div>
          <div className="text-xs text-white/50 truncate">
            {currentTrack ? currentTrack.artist : "--"}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-8">
          <button 
            className="opacity-40 hover:opacity-100 text-white transition-opacity disabled:opacity-20"
            onClick={playPrevious}
            disabled={!currentTrack}
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button 
            onClick={togglePlay}
            disabled={!currentTrack}
            className="w-12 h-12 bg-[#92F7FF] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(146,247,255,0.4)] transition-transform active:scale-95 disabled:scale-100 group"
          >
            {isPlaying ? (
              <Pause size={20} fill="#69B4C0" className="text-[#69B4C0]" strokeWidth={3} />
            ) : (
              <Play size={20} fill="#69B4C0" className="ml-1 text-[#69B4C0]" strokeWidth={3} />
            )}
          </button>
          <button 
            onClick={playNext}
            disabled={!currentTrack}
            className="opacity-40 hover:opacity-100 text-white transition-opacity disabled:opacity-20"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
        <div className="w-full max-w-md flex items-center gap-3">
          <span className="text-[10px] text-white/40 font-mono w-8 text-right tabular-nums">
            {formatTime(progress)}
          </span>
          <div className="flex-1 relative flex items-center h-4 group">
            <input 
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              disabled={!currentTrack}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full h-1 bg-white/10 rounded-full relative pointer-events-none">
              <div 
                className="absolute top-0 left-0 h-full bg-[#92F7FF] rounded-full shadow-[0_0_10px_rgba(146,247,255,0.8)] pointer-events-none group-hover:h-1.5 transition-all -translate-y-[calc(50%-0.125rem)]" 
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
          <span className="text-[10px] text-white/40 font-mono w-8 tabular-nums">
            -{formatTime(duration - progress)}
          </span>
        </div>
      </div>

      {/* Volume/Tools */}
      <div className="w-1/4 flex justify-end items-center gap-4">
        <div className="flex flex-col items-end gap-2">
          {settings.highRes && (
            <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold border border-white/10 uppercase tracking-tighter text-white">
              {currentTrack ? 'Lossless' : 'Supports Lossless'}
            </div>
          )}
          <div className="flex items-center gap-3 mr-1">
            <button 
              onClick={() => onNavigate('library')} 
              className="text-white/60 hover:text-white transition-colors"
              title="Go to Library"
            >
              <Library size={16} />
            </button>
            <button 
              onClick={toggleShuffle} 
              className={`transition-colors ${isShuffle ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'text-white/60 hover:text-white'}`}
              title={isShuffle ? "Disable Shuffle" : "Enable Shuffle"}
            >
              <Shuffle size={16} />
            </button>
            <button 
              onClick={() => onNavigate('queue')} 
              className="text-white/60 hover:text-white transition-colors"
              title="Queue"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MusicIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
