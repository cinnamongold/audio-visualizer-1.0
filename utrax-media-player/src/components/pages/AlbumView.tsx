import React, { useMemo, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId, Track } from '../../types';
import { ArrowLeft, Play, Music, Edit2, Shuffle } from 'lucide-react';
import EditTrackModal from './EditTrackModal';

export default function AlbumView({ albumName, artistName, onNavigate }: { albumName: string, artistName: string, onNavigate: (id: PageId, params?: any) => void }) {
  const { tracks, playTrack, updateTrack, isShuffle, toggleShuffle } = usePlayer();
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const albumTracks = useMemo(() => {
    return tracks.filter(t => t.album === albumName && t.artist === artistName).sort((a, b) => a.title.localeCompare(b.title));
  }, [tracks, albumName, artistName]);

  const coverUrl = albumTracks.find(t => t.coverUrl)?.coverUrl;

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <button 
        onClick={() => onNavigate('library')}
        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 w-fit"
      >
        <ArrowLeft size={20} /> Back to Library
      </button>

      <div className="flex gap-8 mb-8 items-end">
        <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
          {coverUrl ? (
            <img src={coverUrl} alt={albumName} className="w-full h-full object-cover" />
          ) : (
            <Music size={48} className="text-white/20" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-5xl font-bold tracking-tight text-white mb-2 truncate">{albumName}</h1>
          <p 
            className="text-xl text-white/60 mb-4 hover:underline cursor-pointer w-fit"
            onClick={() => onNavigate('artist', { artistName })}
          >
            {artistName}
          </p>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => albumTracks.length > 0 && playTrack(albumTracks[0])}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
            >
              <Play fill="black" size={24} className="ml-1" />
            </button>
            <button
              onClick={() => {
                toggleShuffle();
                if (!isShuffle && albumTracks.length > 0) {
                  const randomTrack = albumTracks[Math.floor(Math.random() * albumTracks.length)];
                  playTrack(randomTrack);
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg ${isShuffle ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/10 text-white'}`}
              title={isShuffle ? "Disable Shuffle" : "Enable Shuffle & Play Random"}
            >
              <Shuffle size={20} />
            </button>
            <span className="text-white/40 text-sm">{albumTracks.length} tracks</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <div className="flex flex-col gap-2">
          {albumTracks.map((track, index) => (
            <div 
              key={track.id}
              onClick={() => playTrack(track)}
              className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 cursor-pointer group transition-colors"
            >
              <div className="w-8 text-center text-white/30 group-hover:text-white tabular-nums">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{track.title}</div>
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
