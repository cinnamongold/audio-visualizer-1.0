import React from 'react';
import { usePlayer } from '../../context/PlayerContext';

export default function Settings() {
  const { settings, updateSettings } = usePlayer();

  return (
    <div className="p-8 min-h-full max-w-2xl">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">Settings</h1>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center p-6 bg-white/5 rounded-[24px] border border-white/10">
          <div>
            <h3 className="font-semibold text-lg text-white">Group By Album</h3>
            <p className="text-sm text-white/40 mt-1">Organize library by albums vs simple list</p>
          </div>
          <button 
            onClick={() => updateSettings({ groupByAlbum: !settings.groupByAlbum })}
            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings.groupByAlbum ? 'bg-[#92F7FF]' : 'bg-white/10'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white transition-all duration-300 ${settings.groupByAlbum ? 'translate-x-6 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'translate-x-0 opacity-40'}`} />
          </button>
        </div>

        <div className="flex justify-between items-center p-6 bg-white/5 rounded-[24px] border border-white/10">
          <div>
            <h3 className="font-semibold text-lg text-white">High-Res Audio</h3>
            <p className="text-sm text-white/40 mt-1">Enable lossless FLAC/ALAC playback indicator</p>
          </div>
          <button 
            onClick={() => updateSettings({ highRes: !settings.highRes })}
            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings.highRes ? 'bg-[#92F7FF]' : 'bg-white/10'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white transition-all duration-300 ${settings.highRes ? 'translate-x-6 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'translate-x-0 opacity-40'}`} />
          </button>
        </div>
        
        <div className="flex justify-between items-center p-6 bg-white/5 rounded-[24px] border border-white/10">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white">Crossfade Transition</h3>
            <p className="text-sm text-white/40 mt-1">Overlap tracks seamlessly (simulated UI)</p>
          </div>
          <div className="flex items-center gap-6">
            <input 
              type="range" 
              min="0" 
              max="12" 
              value={settings.crossfade} 
              onChange={(e) => updateSettings({ crossfade: parseInt(e.target.value) })}
              className="liquid-slider w-40" 
            />
            <span className="text-white/80 font-mono w-10 text-right">{settings.crossfade}s</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-6 bg-white/5 rounded-[24px] border border-white/10">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white">Recents Tracking Limit</h3>
            <p className="text-sm text-white/40 mt-1">Number of tracks to remember in history</p>
          </div>
          <div className="flex items-center gap-6">
            <select 
              value={settings.historyLimit}
              onChange={(e) => updateSettings({ historyLimit: parseInt(e.target.value) })}
              className="bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 outline-none text-sm w-24"
            >
              <option value="10" className="text-black">10</option>
              <option value="20" className="text-black">20</option>
              <option value="50" className="text-black">50</option>
              <option value="100" className="text-black">100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
