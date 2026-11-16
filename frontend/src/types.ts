export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnail: string;
  uri: string;
  requester?: string;
}

export type LoopMode = "off" | "track" | "queue";

export type AudioFilterPreset =
  | "off"
  | "bassboost"
  | "nightcore"
  | "vaporwave"
  | "8d"
  | "karaoke";

export interface ConnectedUser {
  id: string;
  nickname: string;
}

export interface ActivityNotice {
  id: string;
  message: string;
  timestamp: number;
}

export interface PersonalizedTrackRecommendation extends SearchResult {
  reason: string;
  score?: number;
}

export interface ExploreFeed {
  personalizedTracks: PersonalizedTrackRecommendation[];
  rediscoverTracks: PersonalizedTrackRecommendation[];
  trendingTracks: SearchResult[];
  playlists: PlaylistSearchResult[];
}

export interface LikedTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  uri: string;
  duration: number;
  likedAt: number;
}

export interface VoiceChannelInfo {
  channelName: string;
  listenerCount: number;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  paused?: boolean;
  isPlaying: boolean;
  position: number; // in seconds
  volume: number; // 0 to 100
  loopMode: LoopMode;
  autoplay: boolean;
  audioFilter: AudioFilterPreset;
  sessionPlayCount: number;
  voiceChannel?: VoiceChannelInfo | null;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
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
  tracks: SearchResult[];
  artists: ArtistSearchResult[];
  playlists: PlaylistSearchResult[];
}

export interface ArtistProfile {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  topSongs: SearchResult[];
  albums: PlaylistSearchResult[];
}

export interface PlaylistDetails {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  isAlbum: boolean;
  tracks: SearchResult[];
}

export interface SavedPlaylist {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  trackCount: number;
  url: string;
}

export interface SyncedLyricLine {
  time: number; // seconds
  text: string;
}

export interface LyricsResult {
  lyrics: string;
  syncedLines?: SyncedLyricLine[];
  source: string;
}

export interface TopTrackStat {
  key: string;
  title: string;
  artist: string;
  thumbnail: string;
  uri: string;
  duration: number;
  playCount: number;
  lastPlayedAt: number;
}

export interface TopArtistStat {
  artist: string;
  playCount: number;
}

export interface TopRequesterStat {
  nickname: string;
  playCount: number;
}

export interface ListeningStats {
  totalPlays: number;
  totalDurationSeconds: number;
  topTracks: TopTrackStat[];
  topArtists: TopArtistStat[];
  topRequesters: TopRequesterStat[];
  updatedAt: number;
}

export interface ActionAck {
  ok: boolean;
  error?: string;
}

export interface ReorderPayload {
  fromIndex?: number;
  toIndex?: number;
  trackId?: string;
  direction?: "up" | "down";
}

export interface ClientToServerEvents {
  "track:search": (
    query: string,
    callback: (results: SearchResult[]) => void
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
    payload: { trackId?: string; uri?: string; requester?: string },
    callback?: (ack: ActionAck) => void
  ) => void;
  "track:remove": (trackId: string, callback?: (ack: ActionAck) => void) => void;
  "track:reorder": (
    payload: ReorderPayload,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:togglePause": (callback?: (ack: ActionAck) => void) => void;
  "player:skip": (callback?: (ack: ActionAck) => void) => void;
  "player:previous": (callback?: (ack: ActionAck) => void) => void;
  "player:shuffle": (callback?: (ack: ActionAck) => void) => void;
  "player:loop": (
    mode?: LoopMode,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:autoplay": (
    enabled?: boolean,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:filter": (
    preset: AudioFilterPreset,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:seek": (
    positionSeconds: number,
    callback?: (ack: ActionAck) => void
  ) => void;
  "player:volume": (volume: number, callback?: (ack: ActionAck) => void) => void;
  "user:setNickname": (nickname: string) => void;
  "browse:explore": (
    optionsOrCallback:
      | { force?: boolean }
      | ((feed: ExploreFeed) => void),
    callback?: (feed: ExploreFeed) => void
  ) => void;
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
    callback?: (ack: ActionAck) => void
  ) => void;
  "track:lyrics": (
    payload: { uri?: string; title: string; artist: string },
    callback: (result: LyricsResult | null) => void
  ) => void;
  "stats:get": (callback: (stats: ListeningStats) => void) => void;
  "track:playNext": (
    payload: string | { uri: string; requester?: string },
    callback?: (ack: ActionAck) => void
  ) => void;
  "queue:clear": (callback?: (ack: ActionAck) => void) => void;
  "queue:deduplicate": (
    callback?: (ack: { ok: boolean; removedCount: number; error?: string }) => void
  ) => void;
  "likes:list": (callback: (items: LikedTrack[]) => void) => void;
  "likes:toggle": (
    track: {
      id?: string;
      title: string;
      artist: string;
      thumbnail: string;
      uri: string;
      duration: number;
    },
    callback?: (res: { liked: boolean; items: LikedTrack[] }) => void
  ) => void;
}

export interface ServerToClientEvents {
  "state:sync": (state: PlayerState) => void;
  "playlists:updated": (items: SavedPlaylist[]) => void;
  "likes:updated": (items: LikedTrack[]) => void;
  "users:updated": (users: ConnectedUser[]) => void;
  "activity:notice": (notice: ActivityNotice) => void;
  "stats:updated": (stats: ListeningStats) => void;
  error: (error: { message: string }) => void;
}
