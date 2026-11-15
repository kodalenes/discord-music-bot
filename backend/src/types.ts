export interface QueueTrack {
  id: string;
  encoded: string;
  title: string;
  artist: string;
  duration: number; // seconds
  thumbnail: string;
  uri: string;
  requester: string;
}

export interface SearchTrackResult {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  thumbnail: string;
  uri: string;
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  subscribers: string;
  thumbnail: string;
}

export interface PlaylistSearchResult {
  id: string;
  title: string;
  author: string;
  itemCount: string;
  thumbnail: string;
  isAlbum: boolean;
}

export interface BrowseSearchResult {
  tracks: SearchTrackResult[];
  artists: ArtistSearchResult[];
  playlists: PlaylistSearchResult[];
}

export interface ArtistProfile {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  topSongs: SearchTrackResult[];
  albums: PlaylistSearchResult[];
}

export interface PlaylistDetails {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  isAlbum: boolean;
  tracks: SearchTrackResult[];
}

export interface SavedPlaylist {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  trackCount: number;
  url: string;
}

export interface PlayerState {
  currentTrack: QueueTrack | null;
  queue: QueueTrack[];
  paused: boolean;
  isPlaying: boolean;
  position: number; // seconds
  volume: number; // 0-100
}

export interface ReorderPayload {
  fromIndex?: number;
  toIndex?: number;
  trackId?: string;
  direction?: "up" | "down";
}

export interface ActionAck {
  ok: boolean;
  error?: string;
}

export interface ClientToServerEvents {
  "track:search": (
    query: string,
    callback: (results: SearchTrackResult[]) => void
  ) => void;
  "track:add": (
    payload: string | { uri: string; requester?: string },
    callback?: (ack: ActionAck) => void
  ) => void;
  "track:addMany": (
    uris: string[],
    callback?: (ack: ActionAck) => void
  ) => void;
  "track:playNow": (
    payload: { trackId?: string; uri?: string },
    callback?: (ack: ActionAck) => void
  ) => void;
  "track:remove": (trackId: string, callback?: (ack: ActionAck) => void) => void;
  "track:reorder": (
    payload: ReorderPayload,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:togglePause": (callback?: (ack: ActionAck) => void) => void;
  "player:skip": (callback?: (ack: ActionAck) => void) => void;
  "player:seek": (
    positionSeconds: number,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:volume": (volume: number, callback?: (ack: ActionAck) => void) => void;
  "browse:search": (
    query: string,
    callback: (results: BrowseSearchResult) => void
  ) => void;
  "browse:artist": (
    artistId: string,
    callback: (profile: ArtistProfile | null) => void
  ) => void;
  "browse:playlist": (
    payload: { idOrUrl: string; isAlbum?: boolean },
    callback: (details: PlaylistDetails | null) => void
  ) => void;
  "playlists:list": (callback: (items: SavedPlaylist[]) => void) => void;
  "playlists:save": (
    urlOrId: string,
    callback: (res: {
      ok: boolean;
      playlist?: SavedPlaylist;
      error?: string;
    }) => void
  ) => void;
  "playlists:delete": (
    id: string,
    callback: (ack: ActionAck) => void
  ) => void;
}

export interface ServerToClientEvents {
  "state:sync": (state: PlayerState) => void;
  "playlists:updated": (items: SavedPlaylist[]) => void;
  error: (payload: { message: string }) => void;
}
