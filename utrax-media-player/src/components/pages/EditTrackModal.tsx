import React, { useState, useRef } from 'react';
import { Track } from '../../types';
import { X, Upload, Music } from 'lucide-react';

interface EditTrackModalProps {
  track: Track;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Track>) => void;
}

export default function EditTrackModal({ track, onClose, onSave }: EditTrackModalProps) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album);
  const [year, setYear] = useState(track.year ? track.year.toString() : '');
  const [coverUrl, setCoverUrl] = useState<string | null>(track.coverUrl);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave(track.id, {
      title,
      artist,
      album,
      year: year ? parseInt(year, 10) : undefined,
      coverUrl
    });
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-6 backdrop-blur-sm">
      <div className="bg-[#1a1c23] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-6 max-h-[100dvh] md:max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Edit Metadata</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col gap-3 mx-auto sm:mx-0">
            <div 
              className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
              ) : (
                <Music size={32} className="text-white/20 group-hover:opacity-50 transition-opacity" />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <Upload size={24} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange}
            />
            <p className="text-xs text-center text-white/40 uppercase tracking-widest font-bold">Cover Art</p>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#92F7FF] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Artist</label>
              <input 
                type="text" 
                value={artist} 
                onChange={e => setArtist(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#92F7FF] transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Album</label>
            <input 
              type="text" 
              value={album} 
              onChange={e => setAlbum(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#92F7FF] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-24">
            <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Year</label>
            <input 
              type="text" 
              value={year} 
              onChange={e => setYear(e.target.value)}
              placeholder="YYYY"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#92F7FF] transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#92F7FF] text-[#69B4C0] hover:scale-105 active:scale-95 font-bold shadow-[0_0_15px_rgba(146,247,255,0.2)] transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
