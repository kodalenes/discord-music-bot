import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export const API_URL = import.meta.env.VITE_API_URL || "https://api.ikarusgg.me";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(API_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
