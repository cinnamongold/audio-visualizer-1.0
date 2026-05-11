import React, { useState, useRef, useMemo } from 'react';
import { Track, PageId } from '../../types';
import { ArrowLeft, Upload, Music, Search, CheckCircle2, Circle } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

interface CreatePlaylistViewProps {
  onNavigate: (id: PageId, params?: any) => void;
}

export default function CreatePlaylistView({ onNavigate }: CreatePlaylistViewProps) {
  const { tracks, settings, createPlaylist } = usePlayer();
  const [step, setStep] = useState<1 | 2>(1);
  
  // Step 1: Selection
  const [search, setSearch] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  
  // Step 2: Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayItems = useMemo(() => {
    let filteredTracks = tracks;
    if (search.trim()) {
      const s = search.toLowerCase();
      filteredTracks = tracks.filter(t => 
        t.title.toLowerCase().includes(s) || 
        t.artist.toLowerCase().includes(s) || 
        t.album.toLowerCase().includes(s)
      );
    }

    if (settings.groupByAlbum) {
      const albumsObj = filteredTracks.reduce((acc, track) => {
        const key = `${track.album}-${track.artist}`;
        if (!acc[key]) {
          acc[key] = {
            title: track.album,
            artist: track.artist,
            coverUrl: track.coverUrl,
            tracks: []
          };
        }
        acc[key].tracks.push(track);
        if (!acc[key].coverUrl && track.coverUrl) {
          acc[key].coverUrl = track.coverUrl;
        }
        return acc;
      }, {} as Record<string, any>);
      const albumList = Object.values(albumsObj) as any[];
      albumList.sort((a, b) => a.title.localeCompare(b.title));
      return { type: 'albums' as const, items: albumList };
    } else {
      const sorted = [...filteredTracks];
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      return { type: 'tracks' as const, items: sorted };
    }
  }, [tracks, search, settings.groupByAlbum]);

  const toggleTrack = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const toggleAlbum = (albumTracks: Track[]) => {
    const allSelected = albumTracks.every(t => selectedTrackIds.has(t.id));
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      albumTracks.forEach(t => {
        if (allSelected) next.delete(t.id);
        else next.add(t.id);
      });
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverUrl(URL.createObjectURL(file));
    }
  };

  const selectedTracks = useMemo(() => {
    return tracks.filter(t => selectedTrackIds.has(t.id));
  }, [tracks, selectedTrackIds]);

  const handleSave = () => {
    if (!name.trim()) return;
    createPlaylist(name, description, coverUrl, selectedTracks);
    onNavigate('home');
  };

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <button 
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit shrink-0"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>

      <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            {step === 1 ? 'Select Tracks' : 'Playlist Details'}
          </h1>
          <p className="text-white/50 text-sm">Step {step} of 2</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {step === 1 ? (
          <div className="flex flex-col h-full gap-4">
            <div className="relative shrink-0">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="text" 
                placeholder="Search tracks, artists, or albums..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-[#92F7FF] transition-colors"
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
              {displayItems.type === 'albums' ? (
                <div className="flex flex-col gap-4">
                  {displayItems.items.map((album: any, i: number) => {
                    const allSelected = album.tracks.length > 0 && album.tracks.every((t: Track) => selectedTrackIds.has(t.id));
                    const someSelected = album.tracks.some((t: Track) => selectedTrackIds.has(t.id));
                    
                    return (
                      <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div 
                          className="flex items-center gap-4 cursor-pointer group"
                          onClick={() => toggleAlbum(album.tracks)}
                        >
                          <button className="text-white/40 group-hover:text-white transition-colors">
                            {allSelected ? <CheckCircle2 className="text-[#92F7FF]" /> : (someSelected ? <CheckCircle2 className="text-white/60" /> : <Circle />)}
                          </button>
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
                            {album.coverUrl ? <img src={album.coverUrl} className="w-full h-full object-cover" /> : <Music size={24} className="m-3 text-white/30" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm truncate">{album.title}</h3>
                            <p className="text-white/50 text-xs truncate">{album.artist}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pl-12 flex flex-col gap-1">
                          {album.tracks.map((track: Track) => (
                            <div 
                              key={track.id}
                              onClick={() => toggleTrack(track.id)}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group"
                            >
                              <button className="text-white/40 group-hover:text-white transition-colors shrink-0">
                                {selectedTrackIds.has(track.id) ? <CheckCircle2 size={16} className="text-[#92F7FF]" /> : <Circle size={16} />}
                              </button>
                              <span className="text-sm text-white/80 truncate">{track.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {displayItems.items.map((track: Track) => (
                    <div 
                      key={track.id}
                      onClick={() => toggleTrack(track.id)}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer group"
                    >
                      <button className="text-white/40 group-hover:text-white transition-colors shrink-0">
                        {selectedTrackIds.has(track.id) ? <CheckCircle2 className="text-[#92F7FF]" /> : <Circle />}
                      </button>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                        {track.coverUrl ? <img src={track.coverUrl} className="w-full h-full object-cover" /> : <Music size={16} className="m-3 text-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{track.title}</h3>
                        <p className="text-white/50 text-xs truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar pr-4">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col gap-3 shrink-0 mx-auto md:mx-0">
                <div 
                  className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                  ) : (
                    <div className="text-center group-hover:opacity-50 transition-opacity px-4">
                      <Upload size={32} className="mx-auto mb-2 text-white/30" />
                      <span className="text-xs text-white/40 font-medium">Upload Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <Upload size={32} className="text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageChange}
                />
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Playlist Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="My Awesome Playlist"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#92F7FF] transition-colors"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Description (Optional)</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Give your playlist a catchy description..."
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#92F7FF] transition-colors resize-none min-h-[120px]"
                  />
                </div>
              </div>
            </div>

            {selectedTracks.length > 0 && (
              <div className="border-t border-white/10 pt-6 mt-4">
                <h3 className="text-xl font-bold text-white mb-4">{selectedTracks.length} Tracks Selected</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTracks.slice(0, 10).map(t => (
                    <div key={t.id} className="bg-white/10 px-4 py-2 rounded-full text-sm text-white/80 flex items-center gap-2">
                      {t.title}
                    </div>
                  ))}
                  {selectedTracks.length > 10 && (
                    <div className="bg-white/5 px-4 py-2 rounded-full text-sm text-white/50">
                      +{selectedTracks.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
        <div>
          {step === 1 && (
            <span className="text-white/50 font-medium">
              {selectedTrackIds.size} track{selectedTrackIds.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              className="flex-1 sm:flex-none px-6 py-3 rounded-full text-white/50 hover:text-white hover:bg-white/10 font-bold transition-colors"
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button 
              onClick={() => setStep(2)}
              disabled={selectedTrackIds.size === 0}
              className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-white text-black hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 font-bold transition-all"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-[#92F7FF] text-[#69B4C0] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 font-bold shadow-[0_0_15px_rgba(146,247,255,0.2)] transition-all"
            >
              Create Playlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
