import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId } from '../../types';
import { ArrowLeft, Play, ListMusic, Shuffle } from 'lucide-react';

export default function PlaylistView({ playlistId, onNavigate }: { playlistId: string, onNavigate: (id: PageId, params?: any) => void }) {
  const { playlists, playTrack, tracks, isShuffle, toggleShuffle } = usePlayer();

  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center min-w-0">
        <p className="text-white/50 mb-4">Playlist not found.</p>
        <button 
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  // Find the actual tracks from the central store to make sure we have updated metadata
  const playlistTracks = playlist.tracks.map(pt => tracks.find(t => t.id === pt.id)).filter(Boolean) as typeof tracks;

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <button 
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>

      <div className="flex gap-8 mb-8 items-end shrink-0">
        <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <ListMusic size={48} className="text-[#92F7FF]/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/40 uppercase tracking-widest text-sm font-bold mb-2">Playlist</p>
          <h1 className="text-5xl font-bold tracking-tight text-white mb-2 truncate">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-lg text-white/60 mb-4 line-clamp-2">{playlist.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4">
            <button 
              onClick={() => playlistTracks.length > 0 && playTrack(playlistTracks[0])}
              className="w-12 h-12 rounded-full bg-[#92F7FF] text-[#69B4C0] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(146,247,255,0.3)]"
            >
              <Play fill="currentColor" size={24} className="ml-1" />
            </button>
            <button
              onClick={() => {
                toggleShuffle();
                if (!isShuffle && playlistTracks.length > 0) {
                  const randomTrack = playlistTracks[Math.floor(Math.random() * playlistTracks.length)];
                  playTrack(randomTrack);
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(146,247,255,0.1)] ${isShuffle ? 'bg-[#92F7FF]/20 text-[#92F7FF] border border-[#92F7FF]/30' : 'bg-[#92F7FF]/10 text-[#92F7FF]'}`}
              title={isShuffle ? "Disable Shuffle" : "Enable Shuffle & Play Random"}
            >
              <Shuffle size={20} />
            </button>
            <span className="text-white/40 text-sm font-medium">{playlistTracks.length} tracks</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {playlistTracks.length === 0 ? (
          <div className="h-32 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/30 border-dashed">
            No tracks in this playlist yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {playlistTracks.map((track, index) => (
              <div 
                key={track.id + '-' + index}
                onClick={() => playTrack(track)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 cursor-pointer group transition-colors"
              >
                <div className="w-8 text-center text-white/30 group-hover:text-white tabular-nums shrink-0">
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0 relative">
                  {track.coverUrl ? (
                     <img src={track.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                     <ListMusic size={16} className="m-3 text-white/30" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play fill="white" size={16} className="text-white ml-1" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{track.title}</div>
                  <div className="text-white/50 text-xs truncate hover:underline hover:text-white"
                       onClick={(e) => {
                         e.stopPropagation();
                         onNavigate('artist', { artistName: track.artist });
                       }}>
                    {track.artist}
                  </div>
                </div>
                {track.album && (
                  <div className="hidden md:block flex-1 min-w-0 text-white/40 text-sm truncate hover:underline hover:text-white"
                       onClick={(e) => {
                         e.stopPropagation();
                         onNavigate('album', { albumName: track.album, artistName: track.artist });
                       }}>
                    {track.album}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
