import { useState, useEffect, useRef } from 'react';
import { Home, Library, History, Settings, Disc, Mic, ListMusic, Plus, Download } from 'lucide-react';
import { PageId, PageState } from '../types';
import Logo from './Logo';
import { usePlayer } from '../context/PlayerContext';

interface SidebarProps {
  route: PageState;
  onNavigate: (id: PageId, params?: any) => void;
}

export default function Sidebar({ route, onNavigate }: SidebarProps) {
  const { playlists } = usePlayer();
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'import', label: 'Import', icon: Download },
    { id: 'recents', label: 'Recents', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const [ephemeralPages, setEphemeralPages] = useState<{ state: PageState, switchCount: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isStandard = navItems.some(item => item.id === route.id);
    
    setEphemeralPages(prev => {
      let next = [...prev];
      
      // Increment switch count for all existing
      next = next.map(p => {
        // If this page is currently active, reset its counter
        if (p.state.id === route.id && JSON.stringify(p.state.params) === JSON.stringify(route.params)) {
          return { ...p, switchCount: 0 };
        }
        return { ...p, switchCount: p.switchCount + 1 };
      });
      
      // Filter out those with switchCount > 2
      next = next.filter(p => p.switchCount <= 2);

      if (!isStandard) {
        // If it's already in the list, we updated its switchCount to 0 above
        const exists = next.some(p => p.state.id === route.id && JSON.stringify(p.state.params) === JSON.stringify(route.params));
        if (!exists) {
          next.push({ state: route, switchCount: 0 });
          // Scroll to bottom after state update
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 0);
        }
      }

      return next;
    });
  }, [route]);

  const getEphemeralLabel = (state: PageState) => {
    switch (state.id) {
      case 'album': return state.params?.albumName || 'Album';
      case 'artist': return state.params?.artistName || 'Artist';
      case 'playlist': {
        const pl = playlists.find(p => p.id === state.params?.playlistId);
        return pl ? pl.name : 'Playlist';
      }
      case 'create-playlist': return 'Create Playlist';
      case 'download': return 'Download Music';
      default: return 'Page';
    }
  };

  const getEphemeralIcon = (state: PageState) => {
    switch (state.id) {
      case 'album': return Disc;
      case 'artist': return Mic;
      case 'playlist': return ListMusic;
      case 'create-playlist': return Plus;
      case 'download': return Download;
      default: return Disc;
    }
  };

  return (
    <aside className="w-64 bento-container flex flex-col p-6 min-h-0">
      <div className="mb-8 px-2 group cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0" onClick={() => onNavigate('home')}>
        <Logo />
      </div>
      
      <nav className="flex flex-col gap-2 shrink-0">
        {navItems.map((item) => {
          const isActive = route.id === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-white/10 border border-white/10 shadow-inner text-white' 
                  : 'hover:bg-white/5 text-white/40 hover:text-white'}
              `}
            >
              <Icon size={20} className={isActive ? "text-blue-400 shrink-0" : "shrink-0"} />
              <span className="font-medium truncate">{item.label}</span>
              {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 ml-auto flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {ephemeralPages.length > 0 && (
        <div 
          ref={scrollRef}
          className="mt-4 pt-4 border-t border-white/10 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 -mr-2 pr-2"
        >
          {ephemeralPages.map((ephemeral, index) => {
            const isActive = route.id === ephemeral.state.id && JSON.stringify(route.params) === JSON.stringify(ephemeral.state.params);
            const Icon = getEphemeralIcon(ephemeral.state);
            return (
              <button
                key={`${ephemeral.state.id}-${JSON.stringify(ephemeral.state.params)}-${index}`}
                onClick={() => onNavigate(ephemeral.state.id, ephemeral.state.params)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group shrink-0
                  ${isActive 
                    ? 'bg-white/10 border border-white/10 shadow-inner text-white' 
                    : 'hover:bg-white/5 text-white/40 hover:text-white'}
                `}
              >
                <Icon size={18} className={isActive ? "text-blue-400 shrink-0" : "shrink-0"} />
                <span className="font-medium text-sm truncate">{getEphemeralLabel(ephemeral.state)}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
