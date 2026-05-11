import React from 'react';
import { Play, Music, Trash2, Shuffle } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId } from '../../types';

export default function Recents({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  const { history, playTrack, removeFromHistory, settings, isShuffle, toggleShuffle, tracks } = usePlayer();

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-1">Recents</h1>
          <p className="text-white/50 text-sm">Last {settings.historyLimit} tracks played</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {history.length === 0 ? (
          <div className="h-40 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white/40 border-dashed">
            No history yet. Start playing some tracks!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((track, i) => (
              <div 
                key={track.id + '-' + i}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 group transition-colors"
              >
                <div 
                  className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 relative cursor-pointer"
                  onClick={() => playTrack(track)}
                >
                  {track.coverUrl ? (
                    <img src={track.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30"><Music size={20} /></div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); playTrack(track); }} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                      <Play fill="white" size={14} className="text-white ml-0.5" />
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
                      <Shuffle size={12} />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrack(track)}>
                  <div className="text-white font-bold truncate">{track.title}</div>
                  <div className="text-white/50 text-xs truncate">{track.artist} • {track.album}</div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <button 
                    onClick={() => removeFromHistory(track.id)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
