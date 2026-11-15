import { useEffect, useState, useCallback, useRef } from "react";
import { socket } from "../socket";
import type { PlayerState, SearchResult } from "../types";

const INITIAL_PLAYER_STATE: PlayerState = {
  currentTrack: null,
  queue: [],
  paused: false,
  isPlaying: false,
  position: 0,
  volume: 80,
};

export function useSocket(pin: string | null) {
  const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastError, setLastError] = useState<string | null>(null);
  const positionTimerRef = useRef<number | null>(null);

  // Connection management
  useEffect(() => {
    if (!pin) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    // Set handshake auth token/pin
    socket.auth = { pin };
    (socket.io.opts as { query?: Record<string, string> }).query = { pin };

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      setLastError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (err: Error) => {
      setIsConnected(false);
      setLastError(err.message || "Bağlantı hatası");
    };

    const onStateSync = (newState: PlayerState) => {
      setPlayerState((prev) => ({
        ...prev,
        ...newState,
      }));
    };

    const onError = (error: { message: string }) => {
      setLastError(error.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("state:sync", onStateSync);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("state:sync", onStateSync);
      socket.off("error", onError);
    };
  }, [pin]);

  // Position ticker when playing
  useEffect(() => {
    if (positionTimerRef.current !== null) {
      clearInterval(positionTimerRef.current);
      positionTimerRef.current = null;
    }

    if (playerState.isPlaying && playerState.currentTrack) {
      positionTimerRef.current = window.setInterval(() => {
        setPlayerState((prev) => {
          if (!prev.isPlaying || !prev.currentTrack) return prev;
          const nextPos = prev.position + 1;
          if (nextPos >= prev.currentTrack.duration) {
            return { ...prev, position: prev.currentTrack.duration };
          }
          return { ...prev, position: nextPos };
        });
      }, 1000);
    }

    return () => {
      if (positionTimerRef.current !== null) {
        clearInterval(positionTimerRef.current);
      }
    };
  }, [playerState.isPlaying, playerState.currentTrack]);

  const search = useCallback((query: string): Promise<SearchResult[]> => {
    return new Promise((resolve) => {
      if (!query.trim()) {
        resolve([]);
        return;
      }
      socket.emit("track:search", query, (results) => {
        resolve(results || []);
      });
    });
  }, []);

  const addTrack = useCallback(
    (track: { uri: string; title?: string; artist?: string; thumbnail?: string; duration?: number }) => {
      socket.emit("track:add", { uri: track.uri });
    },
    []
  );

  const removeTrack = useCallback((trackId: string) => {
    socket.emit("track:remove", trackId);
  }, []);

  const moveTrack = useCallback((trackId: string, direction: "up" | "down") => {
    socket.emit("track:reorder", { trackId, direction });
  }, []);

  const play = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: true, paused: false }));
    socket.emit("player:togglePause");
  }, []);

  const pause = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false, paused: true }));
    socket.emit("player:togglePause");
  }, []);

  const skip = useCallback(() => {
    socket.emit("player:skip");
  }, []);

  const seek = useCallback((position: number) => {
    setPlayerState((prev) => ({ ...prev, position }));
    socket.emit("player:seek", position);
  }, []);

  const setVolume = useCallback((volume: number) => {
    setPlayerState((prev) => ({ ...prev, volume }));
    socket.emit("player:volume", volume);
  }, []);

  return {
    playerState,
    isConnected,
    lastError,
    clearError: () => setLastError(null),
    search,
    addTrack,
    removeTrack,
    moveTrack,
    play,
    pause,
    skip,
    seek,
    setVolume,
  };
}
