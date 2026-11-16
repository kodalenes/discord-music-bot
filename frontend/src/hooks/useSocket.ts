import { useEffect, useState, useCallback, useRef } from "react";
import { socket } from "../socket";
import type {
  ActivityNotice,
  ArtistProfile,
  AudioFilterPreset,
  BrowseSearchResult,
  ConnectedUser,
  ExploreFeed,
  LikedTrack,
  ListeningStats,
  LoopMode,
  LyricsResult,
  PlayerState,
  PlaylistDetails,
  SavedPlaylist,
  SearchResult,
} from "../types";

const INITIAL_STATS: ListeningStats = {
  totalPlays: 0,
  totalDurationSeconds: 0,
  topTracks: [],
  topArtists: [],
  topRequesters: [],
  updatedAt: 0,
};

const INITIAL_PLAYER_STATE: PlayerState = {
  currentTrack: null,
  queue: [],
  history: [],
  paused: false,
  isPlaying: false,
  position: 0,
  volume: 80,
  loopMode: "off",
  autoplay: false,
  audioFilter: "off",
  sessionPlayCount: 0,
};

export function useSocket(pin: string | null, nickname: string) {
  const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_PLAYER_STATE);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [stats, setStats] = useState<ListeningStats>(INITIAL_STATS);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [notices, setNotices] = useState<ActivityNotice[]>([]);
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

    // Set handshake auth token/pin + nickname
    socket.auth = { pin, nickname };
    (socket.io.opts as { query?: Record<string, string> }).query = {
      pin,
      nickname,
    };

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      setLastError(null);
      socket.emit("playlists:list", (items) => {
        if (Array.isArray(items)) setSavedPlaylists(items);
      });
      socket.emit("likes:list", (items) => {
        if (Array.isArray(items)) setLikedTracks(items);
      });
      socket.emit("stats:get", (s) => {
        if (s) setStats(s);
      });
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

    const onPlaylistsUpdated = (items: SavedPlaylist[]) => {
      setSavedPlaylists(items);
    };

    const onLikesUpdated = (items: LikedTrack[]) => {
      setLikedTracks(items);
    };

    const onUsersUpdated = (users: ConnectedUser[]) => {
      setConnectedUsers(users);
    };

    const onStatsUpdated = (updated: ListeningStats) => {
      setStats(updated);
    };

    const onActivityNotice = (notice: ActivityNotice) => {
      setNotices((prev) => [...prev.slice(-3), notice]);
      window.setTimeout(() => {
        setNotices((prev) => prev.filter((n) => n.id !== notice.id));
      }, 4000);
    };

    const onError = (error: { message: string }) => {
      setLastError(error.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("state:sync", onStateSync);
    socket.on("playlists:updated", onPlaylistsUpdated);
    socket.on("likes:updated", onLikesUpdated);
    socket.on("users:updated", onUsersUpdated);
    socket.on("activity:notice", onActivityNotice);
    socket.on("stats:updated", onStatsUpdated);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("state:sync", onStateSync);
      socket.off("playlists:updated", onPlaylistsUpdated);
      socket.off("likes:updated", onLikesUpdated);
      socket.off("users:updated", onUsersUpdated);
      socket.off("activity:notice", onActivityNotice);
      socket.off("stats:updated", onStatsUpdated);
      socket.off("error", onError);
    };
  }, [pin, nickname]);

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

  const reorderTrack = useCallback((fromIndex: number, toIndex: number) => {
    socket.emit("track:reorder", { fromIndex, toIndex });
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

  const previous = useCallback(() => {
    socket.emit("player:previous");
  }, []);

  const shuffle = useCallback(() => {
    socket.emit("player:shuffle");
  }, []);

  const cycleLoop = useCallback((mode?: LoopMode) => {
    socket.emit("player:loop", mode);
  }, []);

  const toggleAutoplay = useCallback((enabled?: boolean) => {
    socket.emit("player:autoplay", enabled);
  }, []);

  const setAudioFilter = useCallback((preset: AudioFilterPreset) => {
    socket.emit("player:filter", preset);
  }, []);

  const updateNickname = useCallback((nextNick: string) => {
    socket.emit("user:setNickname", nextNick);
  }, []);

  const getExploreFeed = useCallback((): Promise<ExploreFeed> => {
    return new Promise((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({
            personalizedTracks: [],
            rediscoverTracks: [],
            trendingTracks: [],
            playlists: [],
          });
        }
      }, 8000);

      socket.emit("browse:explore", (feed) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(
            feed || {
              personalizedTracks: [],
              rediscoverTracks: [],
              trendingTracks: [],
              playlists: [],
            }
          );
        }
      });
    });
  }, []);

  const seek = useCallback((position: number) => {
    setPlayerState((prev) => ({ ...prev, position }));
    socket.emit("player:seek", position);
  }, []);

  const setVolume = useCallback((volume: number) => {
    setPlayerState((prev) => ({ ...prev, volume }));
    socket.emit("player:volume", volume);
  }, []);

  const browseSearch = useCallback(
    (query: string): Promise<BrowseSearchResult> => {
      return new Promise((resolve) => {
        if (!query.trim()) {
          resolve({ tracks: [], artists: [], playlists: [] });
          return;
        }
        socket.emit("browse:search", query, (results) => {
          resolve(results || { tracks: [], artists: [], playlists: [] });
        });
      });
    },
    []
  );

  const getArtistProfile = useCallback(
    (artistId: string): Promise<ArtistProfile | null> => {
      return new Promise((resolve) => {
        socket.emit("browse:artist", artistId, (profile) => {
          resolve(profile ?? null);
        });
      });
    },
    []
  );

  const getPlaylistDetails = useCallback(
    (idOrUrl: string, isAlbum?: boolean): Promise<PlaylistDetails | null> => {
      return new Promise((resolve) => {
        socket.emit("browse:playlist", { idOrUrl, isAlbum }, (details) => {
          resolve(details ?? null);
        });
      });
    },
    []
  );

  const addTracks = useCallback((uris: string[]): Promise<boolean> => {
    return new Promise((resolve) => {
      if (uris.length === 0) {
        resolve(false);
        return;
      }
      socket.emit("track:addMany", uris, (ack) => {
        resolve(Boolean(ack?.ok));
      });
    });
  }, []);

  const playNow = useCallback(
    (payload: { trackId?: string; uri?: string }): Promise<boolean> => {
      return new Promise((resolve) => {
        socket.emit("track:playNow", payload, (ack) => {
          resolve(Boolean(ack?.ok));
        });
      });
    },
    []
  );

  const savePlaylist = useCallback(
    (
      urlOrId: string
    ): Promise<{ ok: boolean; playlist?: SavedPlaylist; error?: string }> => {
      return new Promise((resolve) => {
        socket.emit("playlists:save", urlOrId, (res) => {
          resolve(res);
        });
      });
    },
    []
  );

  const deletePlaylist = useCallback((id: string) => {
    socket.emit("playlists:delete", id);
  }, []);

  const playNextTrack = useCallback(
    (payload: string | { uri: string; requester?: string }) => {
      socket.emit("track:playNext", payload);
    },
    []
  );

  const clearQueue = useCallback(() => {
    socket.emit("queue:clear");
  }, []);

  const deduplicateQueue = useCallback(() => {
    socket.emit("queue:deduplicate");
  }, []);

  const toggleLike = useCallback(
    (track: {
      id?: string;
      title: string;
      artist: string;
      thumbnail: string;
      uri: string;
      duration: number;
    }) => {
      socket.emit("likes:toggle", track);
    },
    []
  );

  const getLyrics = useCallback(
    (payload: {
      uri?: string;
      title: string;
      artist: string;
    }): Promise<LyricsResult | null> => {
      return new Promise((resolve) => {
        socket.emit("track:lyrics", payload, (result) => {
          resolve(result ?? null);
        });
      });
    },
    []
  );

  return {
    playerState,
    savedPlaylists,
    likedTracks,
    stats,
    connectedUsers,
    notices,
    isConnected,
    lastError,
    clearError: () => setLastError(null),
    search,
    browseSearch,
    getArtistProfile,
    getPlaylistDetails,
    getExploreFeed,
    addTrack,
    addTracks,
    playNow,
    playNextTrack,
    clearQueue,
    deduplicateQueue,
    toggleLike,
    removeTrack,
    moveTrack,
    reorderTrack,
    play,
    pause,
    skip,
    previous,
    shuffle,
    cycleLoop,
    toggleAutoplay,
    setAudioFilter,
    seek,
    setVolume,
    savePlaylist,
    deletePlaylist,
    getLyrics,
    updateNickname,
  };
}
