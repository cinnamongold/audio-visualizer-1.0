import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track, Playlist, AppSettings } from '../types';

interface PlayerContextType {
  tracks: Track[];
  addTracks: (newTracks: Track[]) => void;
  removeTrack: (id: string) => void;
  history: Track[];
  addToHistory: (track: Track) => void;
  removeFromHistory: (trackId: string) => void;
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string, coverUrl?: string | null, initialTracks?: Track[]) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  currentTrack: Track | null;
  playTrack: (track: Track) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  queue: Track[];
  addToQueue: (track: Track, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  removeMultipleFromQueue: (indices: number[]) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    crossfade: 4,
    highRes: true,
    historyLimit: 20,
    groupByAlbum: true,
  });
  
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);


  const addTracks = (newTracks: Track[]) => {
    setTracks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const filtered = newTracks.filter(t => !existingIds.has(t.id));
      return [...prev, ...filtered];
    });
  };

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  const addToHistory = (track: Track) => {
    setHistory(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, settings.historyLimit);
    });
  };

  const removeFromHistory = (trackId: string) => {
    setHistory(prev => prev.filter(t => t.id !== trackId));
  };

  const createPlaylist = (name: string, description: string = '', coverUrl: string | null = null, initialTracks: Track[] = []) => {
    setPlaylists(prev => [
      ...prev,
      { id: Date.now().toString(), name, description, coverUrl, tracks: initialTracks }
    ]);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setHistory(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (currentTrack?.id === id) {
      setCurrentTrack(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    addToHistory(track);
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const addToQueue = (track: Track, playNext?: boolean) => {
    setQueue(prev => {
      if (playNext) {
        return [track, ...prev];
      }
      return [...prev, track];
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const removeMultipleFromQueue = (indices: number[]) => {
    const indicesSet = new Set(indices);
    setQueue(prev => prev.filter((_, i) => !indicesSet.has(i)));
  };

  const clearQueue = () => setQueue([]);

  const shuffleQueue = () => {
    setQueue(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const playNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      playTrack(nextTrack);
      return;
    }

    if (!currentTrack || tracks.length === 0) return;
    
    if (isShuffle) {
      const remainingTracks = tracks.filter(t => t.id !== currentTrack.id);
      if (remainingTracks.length > 0) {
        const randomTrack = remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
        playTrack(randomTrack);
      }
      return;
    }

    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      playTrack(tracks[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(tracks[currentIndex - 1]);
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        tracks, addTracks, removeTrack,
        history, addToHistory, removeFromHistory,
        playlists, createPlaylist,
        settings, updateSettings,
        updateTrack,
        currentTrack, playTrack,
        isPlaying, setIsPlaying,
        isShuffle, toggleShuffle,
        queue, addToQueue, removeFromQueue, removeMultipleFromQueue, clearQueue, shuffleQueue,
        playNext, playPrevious,
        audioRef
      }}
    >
      {children}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={URL.createObjectURL(currentTrack.file)}
          onEnded={playNext}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}
    </PlayerContext.Provider>
  );
}
