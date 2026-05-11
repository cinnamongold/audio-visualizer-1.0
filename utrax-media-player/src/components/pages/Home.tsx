import React, { useMemo } from 'react';
import { Play, Music, Plus, ListMusic, Shuffle } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId } from '../../types';

export default function Home({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  const { history, playlists, tracks, playTrack, settings, isShuffle, toggleShuffle } = usePlayer();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const stats = useMemo(() => {
    const totalAlbums = new Set(tracks.map(t => t.album)).size;
    const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const m = Math.floor(totalDuration / 60);
    const h = Math.floor(m / 60);
    const durationStr = h > 0 ? `${h}h ${m % 60}m` : `${m}m ${Math.floor(totalDuration % 60)}s`;

    return { totalTracks: tracks.length, totalAlbums, durationStr };
  }, [tracks]);

  // Unique recents for display (last 4)
  const recentTracks = useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const t of history) {
      if (!seen.has(t.id)) {
        unique.push(t);
        seen.add(t.id);
        if (unique.length >= 4) break;
      }
    }
    return unique;
  }, [history]);

  return (
    <div className="p-8 h-full flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">{greeting}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 shadow-sm">
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-1">Total Tracks</p>
          <div className="text-3xl font-bold text-white tabular-nums">{stats.totalTracks}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 shadow-sm">
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-1">Total Albums</p>
          <div className="text-3xl font-bold text-white tabular-nums">{stats.totalAlbums}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 shadow-sm">
          <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-1">Library Duration</p>
          <div className="text-3xl font-bold text-white tabular-nums">{stats.durationStr}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 font-medium uppercase text-[10px] tracking-widest">Recently Played</p>
        {history.length > 0 && (
          <button 
            onClick={() => onNavigate('recents')}
            className="text-xs text-white/50 hover:text-white transition-colors uppercase tracking-wider font-bold"
          >
            See All
          </button>
        )}
      </div>
      
      {recentTracks.length === 0 ? (
        <div className="h-32 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center text-white/30 border-dashed mb-10">
          No recently played tracks.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {recentTracks.map(track => (
            <div 
              key={track.id} 
              onClick={() => playTrack(track)}
              className="aspect-square rounded-[24px] bg-white/5 border border-white/10 p-4 flex flex-col gap-3 group hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="w-full aspect-square rounded-xl border border-white/10 shadow-lg overflow-hidden flex items-center justify-center bg-white/5 text-white/20 relative">
                {track.coverUrl ? (
                  <img src={track.coverUrl} className="w-full h-full object-cover" />
                ) : (
                  <Music size={24} />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); playTrack(track); }}
                    className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-colors"
                  >
                    <Play fill="white" size={20} className="text-white ml-0.5" />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      toggleShuffle();
                      if (!isShuffle) {
                        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
                        playTrack(randomTrack);
                      }
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isShuffle ? 'bg-blue-500/40 text-blue-200' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                    title={isShuffle ? "Disable Shuffle" : "Enable Shuffle & Play Random Library Track"}
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-white">{track.title}</p>
                <p className="text-xs text-white/50 truncate mt-0.5">{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-white/40 mb-4 font-medium uppercase text-[10px] tracking-widest">Your Playlists</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <div 
          onClick={() => onNavigate('create-playlist')}
          className="h-32 rounded-[24px] border border-white/10 border-dashed flex flex-col items-center justify-center text-white/40 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
        >
          <Plus size={24} className="mb-2" />
          <span className="text-xs font-bold uppercase tracking-wider">New Playlist</span>
        </div>
        
        {playlists.map(pl => (
          <div 
            key={pl.id} 
            onClick={() => onNavigate('playlist', { playlistId: pl.id })}
            className="h-32 bg-white/5 border border-white/10 rounded-[24px] flex flex-col justify-end p-5 flex-shrink-0 cursor-pointer hover:bg-white/10 transition-colors relative overflow-hidden group"
          >
            {pl.coverUrl && (
              <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                <img src={pl.coverUrl} className="w-full h-full object-cover blur-sm scale-110" />
              </div>
            )}
            <div className="relative z-10">
              <ListMusic size={24} className="text-[#92F7FF] mb-2 drop-shadow-md" />
              <h3 className="font-bold text-white text-lg truncate drop-shadow-md">{pl.name}</h3>
              <p className="text-xs text-white/80 tabular-nums drop-shadow-md">{pl.tracks.length} tracks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
