import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PageId } from '../../types';

export default function DownloadView({ onNavigate }: { onNavigate: (id: PageId, params?: any) => void }) {
  return (
    <div className="p-8 h-full flex flex-col min-w-0">
      <header className="mb-10 shrink-0">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Download Music</h1>
        <p className="text-white/50">Find audio files globally to import here.</p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 content-start">
        <div className="max-w-2xl flex flex-col gap-4">
          <a href="https://fmhy.net/audio" target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                 <img src="/fmhy.png" alt="FMHY" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">FreeMediaHeckYeah (Audio)</h3>
                <p className="text-sm text-white/50">Collection of audio sites. Some may not support downloads.</p>
              </div>
            </div>
            <ExternalLink size={20} className="text-white/30 group-hover:text-blue-400" />
          </a>

          <a href="https://monochrome.tf" target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="14.75 14.75 70.5 70.5"><path fill="currentColor" d="M38.25 14.75h47v47h-23.5v-23.5h-23.5Zm-23.5 23.5h23.5v23.5h23.5v23.5h-47Z"></path></svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Monochrome</h3>
                <p className="text-sm text-white/50">The best free music streaming and downloading!</p>
              </div>
            </div>
            <ExternalLink size={20} className="text-white/30 group-hover:text-blue-400" />
          </a>

          <a href="https://am-dl.pages.dev" target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                 <img src="/am-dl.png" alt="Apple Music Downloader" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Apple Music Downloader</h3>
                <p className="text-sm text-white/50">Get high-quality AAC / ALAC (requires Apple Music track links.)</p>
              </div>
            </div>
            <ExternalLink size={20} className="text-white/30 group-hover:text-blue-400" />
          </a>

          <a href="https://squid.wtf" target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                 <img src="/squid-wtf.png" alt="Squid.WTF" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Squid.WTF</h3>
                <p className="text-sm text-white/50">Frontend to download from several services. Least reliable.</p>
              </div>
            </div>
            <ExternalLink size={20} className="text-white/30 group-hover:text-blue-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
