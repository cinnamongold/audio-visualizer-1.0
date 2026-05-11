import React, { useState, useMemo } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId, Track } from '../../types';
import { ArrowLeft, Play, Music, Trash2, ListPlus, Shuffle, Library, FilePlus, CheckSquare, Square, X, Plus } from 'lucide-react';

export default function QueueView({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  const { queue, tracks, addToQueue, removeFromQueue, removeMultipleFromQueue, shuffleQueue, playTrack, currentTrack } = usePlayer();
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleRemoveSelected = () => {
    if (selectedIndices.size > 0) {
      removeMultipleFromQueue(Array.from(selectedIndices));
      setSelectedIndices(new Set());
      setIsMultiSelectMode(false);
    }
  };

  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;
    const lower = searchQuery.toLowerCase();
    return tracks.filter(t => 
      t.title.toLowerCase().includes(lower) || 
      t.artist.toLowerCase().includes(lower) || 
      t.album.toLowerCase().includes(lower)
    );
  }, [tracks, searchQuery]);

  return (
    <div className="p-8 h-full flex flex-col min-w-0 relative">
      <div className="flex items-center justify-between mb-8 flex-none">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-4xl font-bold text-white tracking-tight">Queue</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition-colors font-semibold"
          >
            <ListPlus size={18} />
            Add Track
          </button>
          <button 
            onClick={shuffleQueue}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white hover:bg-white/10 rounded-xl transition-colors font-semibold"
            disabled={queue.length < 2}
          >
            <Shuffle size={18} />
            Shuffle
          </button>
          <button 
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              if (isMultiSelectMode) setSelectedIndices(new Set());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-semibold ${isMultiSelectMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}
          >
            <CheckSquare size={18} />
            {isMultiSelectMode ? 'Cancel Selection' : 'Multi-Select'}
          </button>
          {isMultiSelectMode && selectedIndices.size > 0 && (
            <button 
              onClick={handleRemoveSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-xl transition-colors font-semibold shadow-lg"
            >
              <Trash2 size={18} />
              Remove ({selectedIndices.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-4">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <ListPlus size={64} className="mb-4 opacity-50" />
            <p className="text-xl font-medium">Queue is empty</p>
            <p className="text-sm mt-2">Add tracks to the queue to listen later</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((track, index) => (
              <div 
                key={`${track.id}-${index}`}
                className={`group flex items-center gap-4 p-3 rounded-2xl transition-all ${selectedIndices.has(index) ? 'bg-white/10' : 'hover:bg-white/5'} cursor-pointer`}
                onClick={() => {
                  if (isMultiSelectMode) {
                    toggleSelection(index);
                  }
                }}
              >
                {isMultiSelectMode && (
                  <button 
                    className="flex-none w-6 h-6 flex items-center justify-center text-white/50 hover:text-white"
                  >
                    {selectedIndices.has(index) ? <CheckSquare size={20} className="text-blue-400" /> : <Square size={20} />}
                  </button>
                )}
                
                <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex-none relative">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30"><Music size={16} /></div>
                  )}
                  {!isMultiSelectMode && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); playTrack(track); removeFromQueue(index); }} className="p-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                        <Play fill="white" size={16} className="text-white ml-0.5" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{track.title}</div>
                  <div className="text-white/50 text-xs truncate">{track.artist} • {track.album}</div>
                </div>

                {!isMultiSelectMode && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity px-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsMultiSelectMode(true); toggleSelection(index); }}
                      className="p-2 text-white/40 hover:text-white transition-colors tooltip"
                      title="Select"
                    >
                      <CheckSquare size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToQueue(track, true); }}
                      className="p-2 text-white/40 hover:text-white transition-colors tooltip"
                      title="Play Next"
                    >
                      <ListPlus size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                      className="p-2 text-white/40 hover:text-white transition-colors tooltip"
                      title="Add to Bottom"
                    >
                      <FilePlus size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNavigate('library'); }}
                      className="p-2 text-white/40 hover:text-white transition-colors tooltip"
                      title="Go to Library"
                    >
                      <Library size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                      className="p-2 text-red-400/60 hover:text-red-400 transition-colors tooltip"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Track Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1A1A1A] w-full max-w-2xl max-h-[80vh] rounded-3xl border border-white/10 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-bold text-white">Add to Queue</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            
            <div className="p-4 border-b border-white/5">
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-[#92F7FF]/50 transition-colors"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filteredTracks.length === 0 ? (
                <div className="text-center py-12 text-white/40">No tracks found</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredTracks.map(track => (
                    <div 
                      key={track.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex-none">
                        {track.coverUrl ? (
                          <img src={track.coverUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30"><Music size={14} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate text-sm">{track.title}</div>
                        <div className="text-white/50 text-xs truncate">{track.artist}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 pr-2">
                        <button
                          onClick={() => addToQueue(track, true)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors whitespace-nowrap"
                        >
                          Play Next
                        </button>
                        <button
                          onClick={() => addToQueue(track)}
                          className="p-1.5 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors"
                          title="Add to Bottom"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
