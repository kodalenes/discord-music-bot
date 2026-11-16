import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CustomPlaylist, CustomPlaylistTrack } from "../types.js";
import { extractVideoId, normalizeMetaKey } from "./StatsStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "custom-playlists.json");

function normalizePlaylistTrackKey(track: {
  id?: string;
  uri?: string;
  title: string;
  artist: string;
}): string {
  const vid = extractVideoId(track.uri);
  if (vid) return `yt:${vid}`;
  if (track.uri?.trim()) return `uri:${track.uri.trim()}`;
  return `meta:${normalizeMetaKey(track.title, track.artist)}`;
}

export class CustomPlaylistsStore {
  private items: CustomPlaylist[] = [];

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
      console.error("[CustomPlaylistsStore] Failed to save:", err);
    }
  }

  public list(): CustomPlaylist[] {
    return this.items.map((pl) => ({ ...pl, tracks: [...pl.tracks] }));
  }

  public create(payload: {
    name: string;
    description?: string;
    thumbnail?: string;
    tracks?: Array<Omit<CustomPlaylistTrack, "addedAt">>;
  }): CustomPlaylist {
    const cleanName = payload.name.trim().slice(0, 80);
    if (!cleanName) {
      throw new Error("Çalma listesi adı boş olamaz.");
    }

    const now = Date.now();
    const seen = new Set<string>();
    const tracks: CustomPlaylistTrack[] = [];

    for (const raw of payload.tracks ?? []) {
      const key = normalizePlaylistTrackKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      tracks.push({
        id: raw.id || key,
        title: raw.title,
        artist: raw.artist,
        thumbnail: raw.thumbnail || "",
        uri: raw.uri,
        duration: raw.duration || 0,
        addedAt: now,
      });
    }

    const playlist: CustomPlaylist = {
      id: randomUUID(),
      name: cleanName,
      description: payload.description?.trim().slice(0, 200) || "",
      thumbnail: payload.thumbnail || tracks[0]?.thumbnail || "",
      tracks,
      createdAt: now,
      updatedAt: now,
    };

    this.items = [playlist, ...this.items];
    this.saveToDisk();
    return { ...playlist, tracks: [...playlist.tracks] };
  }

  public update(payload: {
    id: string;
    name: string;
    description?: string;
  }): CustomPlaylist | null {
    const pl = this.items.find((p) => p.id === payload.id);
    if (!pl) return null;

    const cleanName = payload.name.trim().slice(0, 80);
    if (!cleanName) {
      throw new Error("Çalma listesi adı boş olamaz.");
    }

    pl.name = cleanName;
    if (payload.description !== undefined) {
      pl.description = payload.description.trim().slice(0, 200);
    }
    pl.updatedAt = Date.now();
    this.saveToDisk();
    return { ...pl, tracks: [...pl.tracks] };
  }

  public delete(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((p) => p.id !== id);
    if (this.items.length !== before) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public addTrack(
    playlistId: string,
    rawTrack: Omit<CustomPlaylistTrack, "addedAt">
  ): { playlist: CustomPlaylist; added: boolean } {
    const pl = this.items.find((p) => p.id === playlistId);
    if (!pl) {
      throw new Error("Çalma listesi bulunamadı.");
    }

    const newKey = normalizePlaylistTrackKey(rawTrack);
    const alreadyExists = pl.tracks.some(
      (t) => normalizePlaylistTrackKey(t) === newKey
    );
    if (alreadyExists) {
      return { playlist: { ...pl, tracks: [...pl.tracks] }, added: false };
    }

    const entry: CustomPlaylistTrack = {
      id: rawTrack.id || newKey,
      title: rawTrack.title,
      artist: rawTrack.artist,
      thumbnail: rawTrack.thumbnail || "",
      uri: rawTrack.uri,
      duration: rawTrack.duration || 0,
      addedAt: Date.now(),
    };

    pl.tracks.push(entry);
    if (!pl.thumbnail && entry.thumbnail) {
      pl.thumbnail = entry.thumbnail;
    }
    pl.updatedAt = Date.now();
    this.saveToDisk();
    return { playlist: { ...pl, tracks: [...pl.tracks] }, added: true };
  }

  public removeTrack(playlistId: string, trackId: string): boolean {
    const pl = this.items.find((p) => p.id === playlistId);
    if (!pl) return false;

    const before = pl.tracks.length;
    pl.tracks = pl.tracks.filter((t) => t.id !== trackId);
    if (pl.tracks.length === before) return false;

    pl.thumbnail = pl.tracks[0]?.thumbnail || "";
    pl.updatedAt = Date.now();
    this.saveToDisk();
    return true;
  }

  public reorderTrack(
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ): boolean {
    const pl = this.items.find((p) => p.id === playlistId);
    if (!pl) return false;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= pl.tracks.length ||
      toIndex >= pl.tracks.length ||
      fromIndex === toIndex
    ) {
      return false;
    }

    const [moved] = pl.tracks.splice(fromIndex, 1);
    if (!moved) return false;
    pl.tracks.splice(toIndex, 0, moved);
    pl.thumbnail = pl.tracks[0]?.thumbnail || "";
    pl.updatedAt = Date.now();
    this.saveToDisk();
    return true;
  }
}
