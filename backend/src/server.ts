import http from "node:http";
import cors from "cors";
import express from "express";
import { Server, type Socket } from "socket.io";
import { config } from "./config.js";
import type { MusicManager } from "./music/MusicManager.js";
import type {
  ClientToServerEvents,
  PlayerState,
  ServerToClientEvents,
} from "./types.js";

type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface AppServer {
  io: TypedIO;
  httpServer: http.Server;
  broadcastState: (state: PlayerState) => void;
  start: () => Promise<void>;
  close: () => Promise<void>;
}

export function createServer(getMusicManager: () => MusicManager): AppServer {
  const app = express();

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

  io.on("connection", (socket: TypedSocket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
    const manager = getMusicManager();

    // Send initial state immediately on connect
    socket.emit("state:sync", manager.getState());

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
        const requester =
          typeof payload === "string" ? "Web" : (payload.requester ?? "Web");
        await manager.addTrack(uri, requester);
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
        await manager.skip();
        callback?.({ ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to skip track.";
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

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected (${socket.id}): ${reason}`);
    });
  });

  const broadcastState = (state: PlayerState): void => {
    io.emit("state:sync", state);
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
    start,
    close,
  };
}
