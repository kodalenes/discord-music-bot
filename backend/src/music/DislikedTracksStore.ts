import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DislikedTrack } from "../types.js";
import { extractVideoId, normalizeMetaKey } from "./StatsStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "disliked-tracks.json");

function normalizeDislikedId(track: {
  id?: string;
  uri?: string;
  title: string;
  artist: string;
}): string {
  const vid = extractVideoId(track.uri);
  if (vid) return `yt:${vid}`;
  if (track.uri?.trim()) return `uri:${track.uri.trim()}`;
  if (track.id && !track.id.includes("-")) return `id:${track.id}`;
  return `meta:${normalizeMetaKey(track.title, track.artist)}`;
}

export class DislikedTracksStore {
  private items: DislikedTrack[] = [];

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
      console.error("[DislikedTracksStore] Failed to save:", err);
    }
  }

  public list(): DislikedTrack[] {
    return [...this.items];
  }

  public add(track: {
    id?: string;
    title: string;
    artist: string;
    thumbnail?: string;
    uri?: string;
    duration?: number;
  }): { added: boolean; items: DislikedTrack[] } {
    const normId = normalizeDislikedId(track);
    const metaKey = normalizeMetaKey(track.title, track.artist);
    const exists = this.items.some(
      (item) =>
        item.id === normId ||
        normalizeMetaKey(item.title, item.artist) === metaKey
    );
    if (exists) {
      return { added: false, items: this.list() };
    }

    const entry: DislikedTrack = {
      id: normId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail || "",
      uri: track.uri || "",
      duration: track.duration || 0,
      dislikedAt: Date.now(),
    };
    this.items = [entry, ...this.items];
    this.saveToDisk();
    return { added: true, items: this.list() };
  }

  public toggle(track: {
    id?: string;
    title: string;
    artist: string;
    thumbnail?: string;
    uri?: string;
    duration?: number;
  }): { disliked: boolean; items: DislikedTrack[] } {
    const normId = normalizeDislikedId(track);
    const metaKey = normalizeMetaKey(track.title, track.artist);
    const exists = this.items.some(
      (item) =>
        item.id === normId ||
        normalizeMetaKey(item.title, item.artist) === metaKey
    );
    if (exists) {
      this.items = this.items.filter(
        (item) =>
          item.id !== normId &&
          normalizeMetaKey(item.title, item.artist) !== metaKey
      );
      this.saveToDisk();
      return { disliked: false, items: this.list() };
    }

    const entry: DislikedTrack = {
      id: normId,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail || "",
      uri: track.uri || "",
      duration: track.duration || 0,
      dislikedAt: Date.now(),
    };
    this.items = [entry, ...this.items];
    this.saveToDisk();
    return { disliked: true, items: this.list() };
  }
}
