import React, { useMemo, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId, Track } from '../../types';
import { ArrowLeft, Play, Music, Edit2, Shuffle } from 'lucide-react';
import EditTrackModal from './EditTrackModal';

export default function ArtistView({ artistName, onNavigate }: { artistName: string, onNavigate: (id: PageId, params?: any) => void }) {
  const { tracks, playTrack, settings, updateTrack, isShuffle, toggleShuffle } = usePlayer();
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const artistTracks = useMemo(() => {
    return tracks.filter(t => t.artist === artistName);
  }, [tracks, artistName]);

  const artistAlbumsObj = useMemo(() => {
    return artistTracks.reduce((acc, track) => {
      const key = track.album;
      if (!acc[key]) {
        acc[key] = {
          title: track.album,
          artist: track.artist,
          coverUrl: track.coverUrl,
          year: track.year,
          tracks: []
        };
      }
      acc[key].tracks.push(track);
      if (!acc[key].coverUrl && track.coverUrl) {
        acc[key].coverUrl = track.coverUrl;
      }
      return acc;
    }, {} as Record<string, any>);
  }, [artistTracks]);

  const artistAlbums = useMemo(() => (Object.values(artistAlbumsObj) as any[]).sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)), [artistAlbumsObj]);

  const coverUrl = artistAlbums.find(a => a.coverUrl)?.coverUrl;

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <button 
        onClick={() => onNavigate('library')}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit"
      >
        <ArrowLeft size={20} /> Back to Library
      </button>

      <div className="flex gap-8 mb-8 items-center">
        <div className="w-40 h-40 rounded-full bg-white/5 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
          {coverUrl ? (
            <img src={coverUrl} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl text-white/20 font-bold">{artistName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/40 uppercase tracking-widest text-sm font-bold mb-1">Artist</p>
          <h1 className="text-5xl font-bold tracking-tight text-white mb-4 truncate">{artistName}</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => artistTracks.length > 0 && playTrack(artistTracks[0])}
              className="w-12 h-12 rounded-full bg-[#92F7FF] text-[#69B4C0] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(146,247,255,0.3)]"
            >
              <Play fill="currentColor" size={24} className="ml-1" />
            </button>
            <button
              onClick={() => {
                toggleShuffle();
                if (!isShuffle && artistTracks.length > 0) {
                  const randomTrack = artistTracks[Math.floor(Math.random() * artistTracks.length)];
                  playTrack(randomTrack);
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(146,247,255,0.1)] ${isShuffle ? 'bg-[#92F7FF]/20 text-[#92F7FF] border border-[#92F7FF]/30' : 'bg-[#92F7FF]/10 text-[#92F7FF]'}`}
              title={isShuffle ? "Disable Shuffle" : "Enable Shuffle & Play Random"}
            >
              <Shuffle size={20} />
            </button>
            <span className="text-white/40 text-sm">{artistTracks.length} total tracks</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {settings.groupByAlbum ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
            {artistAlbums.map((album: any, i: number) => (
              <div 
                key={i} 
                onClick={() => onNavigate('album', { albumName: album.title, artistName: album.artist })}
                className="group rounded-[24px] border border-white/10 shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-white/5 p-4 flex flex-col gap-3 hover:bg-white/10"
              >
                <div className="aspect-square w-full rounded-xl border border-white/10 shadow-inner overflow-hidden flex items-center justify-center bg-white/5 text-white/20 relative">
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music size={32} />
                  )}
                </div>
                <div className="overflow-hidden p-1">
                  <h2 className="font-bold truncate text-white text-sm">{album.title}</h2>
                  <p className="text-white/40 text-xs mt-1">{album.year}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {artistTracks.map((track) => (
              <div 
                key={track.id}
                onClick={() => playTrack(track)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 cursor-pointer group transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 relative">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30"><Music size={16} /></div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); playTrack(track); }} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                      <Play fill="white" size={12} className="text-white ml-0.5" />
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
                      className={`p-1.5 rounded-full transition-colors ${isShuffle ? 'bg-blue-500/40 text-blue-200' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                    >
                      <Shuffle size={10} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{track.title}</div>
                  <div className="text-white/50 text-xs truncate">{track.album}</div>
                </div>
                {track.year && <div className="text-white/30 text-xs tabular-nums">{track.year}</div>}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTrack(track);
                    }}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTrack && (
        <EditTrackModal 
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSave={updateTrack}
        />
      )}
    </div>
  );
}
