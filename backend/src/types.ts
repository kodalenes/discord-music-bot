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
  error: (payload: { message: string }) => void;
}
