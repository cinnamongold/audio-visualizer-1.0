import React, { useState, useMemo } from 'react';
import { Music, Shuffle, Play, Edit2, ListMusic } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { PageId, Track } from '../../types';
import EditTrackModal from './EditTrackModal';

export default function Library({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  const { tracks, settings, playTrack, updateTrack, playlists, isShuffle, toggleShuffle } = usePlayer();
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'album' | 'artist' | 'year'>('name-asc');
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const displayItems = useMemo(() => {
    if (settings.groupByAlbum) {
      const albumsObj = tracks.reduce((acc, track) => {
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
      const albumList = Object.values(albumsObj);

      switch (sortBy) {
        case 'name-asc': albumList.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'name-desc': albumList.sort((a, b) => b.title.localeCompare(a.title)); break;
        case 'artist': albumList.sort((a, b) => a.artist.localeCompare(b.artist)); break;
        default: albumList.sort((a, b) => a.title.localeCompare(b.title)); break;
      }
      return { type: 'albums' as const, items: albumList };
    } else {
      const sorted = [...tracks];
      switch (sortBy) {
        case 'name-asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'name-desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
        case 'album': sorted.sort((a, b) => a.album.localeCompare(b.album)); break;
        case 'artist': sorted.sort((a, b) => a.artist.localeCompare(b.artist)); break;
        case 'year': sorted.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
      }
      return { type: 'tracks' as const, items: sorted };
    }
  }, [tracks, settings.groupByAlbum, sortBy]);

  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1 text-white">Your Library</h1>
          <p className="text-white/50 text-sm">
            {tracks.length} Tracks • {displayItems.type === 'albums' ? `${displayItems.items.length} Albums` : `All Tracks`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 outline-none text-sm"
          >
            <option value="name-asc" className="text-black">Name (A-Z)</option>
            <option value="name-desc" className="text-black">Name (Z-A)</option>
            <option value="artist" className="text-black">Artist</option>
            {settings.groupByAlbum ? null : <option value="album" className="text-black">Album</option>}
            {settings.groupByAlbum ? null : <option value="year" className="text-black">Year</option>}
          </select>
          <button 
            id="import-tracks-btn"
            onClick={() => onNavigate('import')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-semibold shadow-lg transition-all text-white active:scale-95"
          >
            Import Tracks
          </button>
        </div>
      </header>


      <div className="flex-1 overflow-hidden">
        {displayItems.items.length === 0 && playlists.length === 0 ? (
          <div className="h-40 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white/40 border-dashed">
            No tracks or playlists imported yet.
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar pr-4 pb-4">
            {playlists.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
                  {playlists.map(pl => (
                    <div 
                      key={pl.id} 
                      onClick={() => onNavigate('playlist', { playlistId: pl.id })}
                      className="group rounded-[24px] border border-white/10 shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-white/5 p-4 flex flex-col gap-3 hover:bg-white/10"
                    >
                      <div className="aspect-square w-full rounded-xl border border-white/10 shadow-inner overflow-hidden flex items-center justify-center bg-white/5 text-white/20 relative">
                        {pl.coverUrl ? (
                          <img src={pl.coverUrl} className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic size={32} />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onNavigate('playlist', { playlistId: pl.id }); }}
                            className="bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors flex items-center justify-center"
                          >
                            <Play fill="white" size={24} className="text-white ml-0.5" />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              toggleShuffle();
                              if (!isShuffle && pl.tracks.length > 0) {
                                const realTracks = pl.tracks.map((pt: any) => tracks.find((t: any) => t.id === pt.id)).filter(Boolean) as Track[];
                                if (realTracks.length > 0) {
                                  const randomTrack = realTracks[Math.floor(Math.random() * realTracks.length)];
                                  playTrack(randomTrack);
                                }
                              }
                            }}
                            className={`p-3 rounded-full transition-colors ${isShuffle ? 'bg-blue-500/40 text-blue-200' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                          >
                            <Shuffle size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-hidden">
                        <h2 className="font-bold truncate text-white text-sm">{pl.name}</h2>
                        <p className="text-white/60 font-medium truncate text-xs">{pl.tracks.length} tracks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayItems.items.length > 0 && (
              <div>
                {playlists.length > 0 && (
                  <h2 className="text-xl font-bold text-white mb-4">
                    {displayItems.type === 'albums' ? 'Albums' : 'Tracks'}
                  </h2>
                )}
                {displayItems.type === 'albums' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
                {displayItems.items.map((album: any, i: number) => {
                  return (
                    <div 
                      key={i} 
                      id={`album-card-${i}`}
                      onClick={() => onNavigate('album', { albumName: album.title, artistName: album.artist })}
                      className="group rounded-[24px] border border-white/10 shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-white/5 p-4 flex flex-col gap-3 hover:bg-white/10"
                    >
                      <div className="aspect-square w-full rounded-xl border border-white/10 shadow-inner overflow-hidden flex items-center justify-center bg-white/5 text-white/20 relative">
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music size={32} />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onNavigate('album', { albumName: album.title, artistName: album.artist }); }}
                            className="bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors flex items-center justify-center"
                          >
                            <Play fill="white" size={24} className="text-white ml-0.5" />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              toggleShuffle();
                              if (!isShuffle && album.tracks.length > 0) {
                                const randomTrack = album.tracks[Math.floor(Math.random() * album.tracks.length)];
                                playTrack(randomTrack);
                              }
                            }}
                            className={`p-3 rounded-full transition-colors ${isShuffle ? 'bg-blue-500/40 text-blue-200' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                          >
                            <Shuffle size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-hidden">
                        <h2 className="font-bold truncate text-white text-sm">{album.title}</h2>
                        <p 
                          className="text-white/60 font-medium truncate text-xs hover:underline hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('artist', { artistName: album.artist });
                          }}
                        >
                          {album.artist}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {displayItems.items.map((track: any, i: number) => (
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
                      <div className="text-white/50 text-xs truncate">{track.artist} • {track.album}</div>
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
          )}
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

