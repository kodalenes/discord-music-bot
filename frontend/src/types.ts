export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnail: string;
  uri: string;
  requester?: string;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  paused?: boolean;
  isPlaying: boolean;
  position: number; // in seconds
  volume: number; // 0 to 100
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnail: string;
  uri: string;
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
}

export interface ServerToClientEvents {
  "state:sync": (state: PlayerState) => void;
  error: (error: { message: string }) => void;
}
