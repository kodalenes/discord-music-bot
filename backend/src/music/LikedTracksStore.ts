import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LikedTrack } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "liked-tracks.json");

function normalizeLikedId(track: {
  id?: string;
  uri?: string;
  title: string;
  artist: string;
}): string {
  const uri = track.uri?.trim() ?? "";
  if (uri) {
    try {
      const parsed = new URL(uri);
      const v = parsed.searchParams.get("v");
      if (v) return `yt:${v}`;
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.replace(/^\/+/, "");
        if (id) return `yt:${id}`;
      }
    } catch {
      // Ignore malformed URI
    }
    return `uri:${uri}`;
  }
  if (track.id && !track.id.includes("-")) return `id:${track.id}`;
  return `meta:${track.title.trim().toLowerCase()}::${track.artist.trim().toLowerCase()}`;
}

export class LikedTracksStore {
  private items: LikedTrack[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed;
        }
      }
    } catch {
      this.items = [];
    }
  }

  private saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.items, null, 2), "utf-8");
    } catch (err) {
      console.error("[LikedTracksStore] Failed to save:", err);
    }
  }

  public list(): LikedTrack[] {
    return [...this.items];
  }

  public toggle(track: {
    id?: string;
    title: string;
    artist: string;
    thumbnail: string;
    uri: string;
    duration: number;
  }): { liked: boolean; items: LikedTrack[] } {
    const normId = normalizeLikedId(track);
    const exists = this.items.some((item) => item.id === normId);
    if (exists) {
      this.items = this.items.filter((item) => item.id !== normId);
      this.saveToDisk();
      return { liked: false, items: this.list() };
    }

    const entry: LikedTrack = {
      id: normId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      uri: track.uri,
      duration: track.duration,
      likedAt: Date.now(),
    };
    this.items = [entry, ...this.items];
    this.saveToDisk();
    return { liked: true, items: this.list() };
  }
}
