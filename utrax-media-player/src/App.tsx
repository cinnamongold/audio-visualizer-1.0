/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import Home from './components/pages/Home';
import Library from './components/pages/Library';
import Recents from './components/pages/Recents';
import Settings from './components/pages/Settings';
import AlbumView from './components/pages/AlbumView';
import ArtistView from './components/pages/ArtistView';
import PlaylistView from './components/pages/PlaylistView';
import CreatePlaylistView from './components/pages/CreatePlaylistView';
import ImportView from './components/pages/ImportView';
import DownloadView from './components/pages/DownloadView';
import QueueView from './components/pages/QueueView';
import { PageId, PageState } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [route, setRoute] = useState<PageState>({ id: 'home' });

  const handleNavigate = (id: PageId, params?: any) => {
    setRoute({ id, params });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col p-6 gap-6 bg-black">
      {/* Ambient Background Layers */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="ambient-gradient top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500 opacity-40"></div>
        <div className="ambient-gradient bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 opacity-30"></div>
        <div className="ambient-gradient top-[20%] right-[10%] w-[40%] h-[40%] bg-pink-500 opacity-20"></div>
      </div>

      <div className="relative z-10 flex flex-1 gap-6 min-h-0">
        {/* Sidebar */}
        <Sidebar route={route} onNavigate={handleNavigate} />

        {/* Main Content Area */}
        <main className="flex-1 bento-container overflow-hidden min-w-0">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={route.id + (route.params ? JSON.stringify(route.params) : '')}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full min-h-full"
              >
                {route.id === 'home' && <Home onNavigate={handleNavigate} />}
                {route.id === 'library' && <Library onNavigate={handleNavigate} />}
                {route.id === 'recents' && <Recents onNavigate={handleNavigate} />}
                {route.id === 'settings' && <Settings />}
                {route.id === 'album' && <AlbumView albumName={route.params?.albumName} artistName={route.params?.artistName} onNavigate={handleNavigate} />}
                {route.id === 'artist' && <ArtistView artistName={route.params?.artistName} onNavigate={handleNavigate} />}
                {route.id === 'playlist' && <PlaylistView playlistId={route.params?.playlistId} onNavigate={handleNavigate} />}
                {route.id === 'create-playlist' && <CreatePlaylistView onNavigate={handleNavigate} />}
                {route.id === 'import' && <ImportView onNavigate={handleNavigate} />}
                {route.id === 'download' && <DownloadView onNavigate={handleNavigate} />}
                {route.id === 'queue' && <QueueView onNavigate={handleNavigate} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Player Bar */}
      <PlayerBar onNavigate={handleNavigate} />
    </div>
  );
}

