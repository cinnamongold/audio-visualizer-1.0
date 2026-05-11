export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  coverUrl: string | null;
  file: File;
  duration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
  tracks: Track[];
}

export interface AppSettings {
  crossfade: number;
  highRes: boolean;
  historyLimit: number;
  groupByAlbum: boolean;
}

export type PageId = 'home' | 'library' | 'recents' | 'settings' | 'album' | 'artist' | 'playlist' | 'create-playlist' | 'import' | 'download' | 'queue';

export interface PageState {
  id: PageId;
  params?: any;
}

