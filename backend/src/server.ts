import http from "node:http";
import cors from "cors";
import express from "express";
import { Server, type Socket } from "socket.io";
import { config } from "./config.js";
import type { MusicManager } from "./music/MusicManager.js";
import { SavedPlaylistsStore } from "./music/SavedPlaylistsStore.js";
import { YoutubeBrowseService } from "./music/YoutubeBrowseService.js";
import type {
  ClientToServerEvents,
  ListeningStats,
  PlayerState,
  ServerToClientEvents,
} from "./types.js";

type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface AppServer {
  io: TypedIO;
  httpServer: http.Server;
  broadcastState: (state: PlayerState) => void;
  broadcastStats: (stats: ListeningStats) => void;
  start: () => Promise<void>;
  close: () => Promise<void>;
}

export function createServer(getMusicManager: () => MusicManager): AppServer {
  const app = express();
  const browseService = new YoutubeBrowseService();
  const playlistsStore = new SavedPlaylistsStore();

  app.use(
    cors({
      origin: [...config.corsOrigins],
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
    });
  });

  const httpServer = http.createServer(app);

  const io: TypedIO = new Server(httpServer, {
    cors: {
      origin: [...config.corsOrigins],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // APP_ACCESS_PIN handshake authentication middleware
  io.use((socket, next) => {
    const authPin =
      typeof socket.handshake.auth?.pin === "string"
        ? socket.handshake.auth.pin
        : undefined;
    const queryPin =
      typeof socket.handshake.query?.pin === "string"
        ? socket.handshake.query.pin
        : undefined;

    const providedPin = (authPin ?? queryPin ?? "").trim();

    if (!providedPin || providedPin !== config.appAccessPin) {
      return next(new Error("Unauthorized: Invalid access PIN"));
    }

    return next();
  });

  const connectedUsers = new Map<string, string>();

  const broadcastUsers = (): void => {
    const users = Array.from(connectedUsers.entries()).map(
      ([id, nickname]) => ({ id, nickname })
    );
    io.emit("users:updated", users);
  };

  const emitActivity = (message: string): void => {
    io.emit("activity:notice", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      timestamp: Date.now(),
    });
  };

  io.on("connection", (socket: TypedSocket) => {
    const rawNick =
      typeof socket.handshake.auth?.nickname === "string"
        ? socket.handshake.auth.nickname
        : typeof socket.handshake.query?.nickname === "string"
          ? socket.handshake.query.nickname
          : "";
    const initialNick = rawNick.trim().slice(0, 24) || "Misafir";
    connectedUsers.set(socket.id, initialNick);

    console.log(`[Socket.io] Client connected: ${socket.id} (${initialNick})`);
    const manager = getMusicManager();

    // Send initial state immediately on connect
    socket.emit("state:sync", manager.getState());
    socket.emit("playlists:updated", playlistsStore.list());
    socket.emit("stats:updated", manager.getStats());
    broadcastUsers();

    socket.on("user:setNickname", (nickname) => {
      const clean = nickname.trim().slice(0, 24) || "Misafir";
      connectedUsers.set(socket.id, clean);
      broadcastUsers();
    });

    socket.on("track:search", async (query, callback) => {
      try {
        const results = await manager.search(query);
        callback(results);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Search failed.";
        console.error("[Socket.io] track:search error:", message);
        socket.emit("error", { message });
        callback([]);
      }
    });

    socket.on("track:add", async (payload, callback) => {
      try {
        const uri = typeof payload === "string" ? payload : payload.uri;
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        const requester =
          typeof payload === "string" ? nick : (payload.requester ?? nick);
        await manager.addTrack(uri, requester);
        emitActivity(`${requester} kuyruğa bir şarkı ekledi`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add track.";
        console.error("[Socket.io] track:add error:", message);
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("track:remove", (trackId, callback) => {
      try {
        manager.removeTrack(trackId);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove track.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("track:reorder", (payload, callback) => {
      try {
        manager.reorderTrack(payload);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reorder queue.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:togglePause", async (callback) => {
      try {
        await manager.togglePause();
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to toggle pause.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:skip", async (callback) => {
      try {
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        await manager.skip();
        emitActivity(`${nick} şarkıyı geçti`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to skip track.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:previous", async (callback) => {
      try {
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        await manager.previous();
        emitActivity(`${nick} önceki şarkıya döndü`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to play previous track.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:shuffle", (callback) => {
      try {
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        manager.shuffle();
        emitActivity(`${nick} kuyruğu karıştırdı`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to shuffle queue.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:loop", (mode, callback) => {
      try {
        const nextMode = manager.setLoop(mode);
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        const label =
          nextMode === "track"
            ? "Tek Şarkı"
            : nextMode === "queue"
              ? "Tüm Kuyruk"
              : "Kapalı";
        emitActivity(`${nick} döngü modunu değiştirdi: ${label}`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to change loop mode.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:autoplay", (enabled, callback) => {
      try {
        const next = manager.setAutoplay(enabled);
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        emitActivity(
          `${nick} otomatik devam modunu ${next ? "açtı" : "kapattı"}`
        );
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to toggle autoplay.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:filter", async (preset, callback) => {
      try {
        await manager.setAudioFilter(preset);
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        emitActivity(`${nick} ses efektini değiştirdi: ${preset}`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to apply audio filter.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:seek", async (positionSeconds, callback) => {
      try {
        await manager.seek(positionSeconds);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to seek.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("player:volume", async (volume, callback) => {
      try {
        await manager.setVolume(volume);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to set volume.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("track:addMany", async (uris, callback) => {
      try {
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        await manager.addTracks(uris, nick);
        emitActivity(`${nick} kuyruğa ${uris.length} şarkı ekledi`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add tracks.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("track:playNow", async (payload, callback) => {
      try {
        const nick = connectedUsers.get(socket.id) ?? "Misafir";
        await manager.playNow({ ...payload, requester: payload.requester ?? nick });
        emitActivity(`${nick} yeni bir şarkı başlattı`);
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to play track.";
        socket.emit("error", { message });
        callback?.({ ok: false, error: message });
      }
    });

    socket.on("browse:search", async (query, callback) => {
      try {
        const result = await browseService.searchAll(query);
        callback(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Browse search failed.";
        console.error("[Socket.io] browse:search error:", message);
        socket.emit("error", { message });
        callback({ tracks: [], artists: [], playlists: [] });
      }
    });

    socket.on("browse:artist", async (artistId, callback) => {
      try {
        const profile = await browseService.getArtistProfile(artistId);
        callback(profile);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load artist.";
        console.error("[Socket.io] browse:artist error:", message);
        socket.emit("error", { message });
        callback(null);
      }
    });

    socket.on("browse:playlist", async (payload, callback) => {
      try {
        const details = await browseService.getPlaylistDetails(
          payload.idOrUrl,
          payload.isAlbum
        );
        callback(details);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load playlist.";
        console.error("[Socket.io] browse:playlist error:", message);
        socket.emit("error", { message });
        callback(null);
      }
    });

    socket.on("playlists:list", (callback) => {
      callback(playlistsStore.list());
    });

    socket.on("playlists:save", async (urlOrId, callback) => {
      try {
        const trimmed = urlOrId.trim();
        if (!trimmed) {
          callback({ ok: false, error: "Geçersiz çalma listesi URL veya ID." });
          return;
        }
        const details = await browseService.getPlaylistDetails(trimmed);
        if (!details) {
          callback({ ok: false, error: "Çalma listesi bulunamadı." });
          return;
        }
        const playlist = {
          id: details.id,
          title: details.title,
          author: details.author,
          thumbnail: details.thumbnail,
          trackCount: details.tracks.length,
          url: `https://music.youtube.com/playlist?list=${details.id.replace(/^VL/, "")}`,
        };
        const updated = playlistsStore.add(playlist);
        io.emit("playlists:updated", updated);
        callback({ ok: true, playlist });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save playlist.";
        socket.emit("error", { message });
        callback({ ok: false, error: message });
      }
    });

    socket.on("playlists:delete", (id, callback) => {
      const updated = playlistsStore.remove(id);
      io.emit("playlists:updated", updated);
      callback?.({ ok: true });
    });

    socket.on("track:lyrics", async (payload, callback) => {
      try {
        const result = await browseService.getLyrics(payload);
        callback(result);
      } catch (err) {
        console.error(
          "[Socket.io] track:lyrics error:",
          err instanceof Error ? err.message : err
        );
        callback(null);
      }
    });

    socket.on("browse:explore", async (callback) => {
      try {
        const analysis = manager.getAnalysisProfile();
        const feed = await browseService.getExploreFeed(analysis);
        callback(feed);
      } catch (err) {
        console.error(
          "[Socket.io] browse:explore error:",
          err instanceof Error ? err.message : err
        );
        callback({
          personalizedTracks: [],
          rediscoverTracks: [],
          trendingTracks: [],
          playlists: [],
        });
      }
    });

    socket.on("stats:get", (callback) => {
      callback(manager.getStats());
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected (${socket.id}): ${reason}`);
      connectedUsers.delete(socket.id);
      broadcastUsers();
    });
  });

  const broadcastState = (state: PlayerState): void => {
    io.emit("state:sync", state);
  };

  const broadcastStats = (stats: ListeningStats): void => {
    io.emit("stats:updated", stats);
  };

  const start = (): Promise<void> =>
    new Promise((resolve) => {
      httpServer.listen(config.port, () => {
        console.log(
          `[Server] Express & Socket.io listening on http://localhost:${config.port}`
        );
        resolve();
      });
    });

  const close = (): Promise<void> =>
    new Promise((resolve) => {
      io.close(() => {
        httpServer.close(() => resolve());
      });
    });

  return {
    io,
    httpServer,
    broadcastState,
    broadcastStats,
    start,
    close,
  };
}
