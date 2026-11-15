import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ListeningStats,
  QueueTrack,
  TopArtistStat,
  TopRequesterStat,
  TopTrackStat,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "stats.json");

interface RawStatsData {
  totalPlays: number;
  totalDurationSeconds: number;
  tracks: Record<string, TopTrackStat>;
  artists: Record<string, TopArtistStat>;
  requesters: Record<string, TopRequesterStat>;
  updatedAt: number;
}

const DEFAULT_DATA: RawStatsData = {
  totalPlays: 0,
  totalDurationSeconds: 0,
  tracks: {},
  artists: {},
  requesters: {},
  updatedAt: 0,
};

function extractTrackKey(track: QueueTrack): string {
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
      // Ignore malformed URI and fall back below
    }
    return `uri:${uri}`;
  }
  return `meta:${track.title.trim().toLowerCase()}::${track.artist.trim().toLowerCase()}`;
}

function normalizeArtistDisplay(artist: string): string {
  return artist.replace(/\s*-\s*Topic$/i, "").trim() || "Bilinmeyen Sanatçı";
}

export class StatsStore {
  private data: RawStatsData = {
    totalPlays: 0,
    totalDurationSeconds: 0,
    tracks: {},
    artists: {},
    requesters: {},
    updatedAt: 0,
  };

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw) as Partial<RawStatsData>;
        this.data = {
          totalPlays:
            typeof parsed.totalPlays === "number" ? parsed.totalPlays : 0,
          totalDurationSeconds:
            typeof parsed.totalDurationSeconds === "number"
              ? parsed.totalDurationSeconds
              : 0,
          tracks: parsed.tracks && typeof parsed.tracks === "object"
            ? parsed.tracks
            : {},
          artists: parsed.artists && typeof parsed.artists === "object"
            ? parsed.artists
            : {},
          requesters:
            parsed.requesters && typeof parsed.requesters === "object"
              ? parsed.requesters
              : {},
          updatedAt:
            typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
        };
      }
    } catch {
      this.data = { ...DEFAULT_DATA, tracks: {}, artists: {}, requesters: {} };
    }
  }

  private saveToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("[StatsStore] Failed to persist stats:", err);
    }
  }

  public recordPlay(track: QueueTrack): ListeningStats {
    const now = Date.now();
    this.data.totalPlays += 1;
    this.data.totalDurationSeconds += Math.max(0, Math.floor(track.duration || 0));
    this.data.updatedAt = now;

    // 1. Track stat
    const trackKey = extractTrackKey(track);
    const existingTrack = this.data.tracks[trackKey];
    if (existingTrack) {
      existingTrack.playCount += 1;
      existingTrack.lastPlayedAt = now;
      if (!existingTrack.thumbnail && track.thumbnail) {
        existingTrack.thumbnail = track.thumbnail;
      }
      if (!existingTrack.uri && track.uri) {
        existingTrack.uri = track.uri;
      }
    } else {
      this.data.tracks[trackKey] = {
        key: trackKey,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        uri: track.uri,
        duration: track.duration,
        playCount: 1,
        lastPlayedAt: now,
      };
    }

    // 2. Artist stat
    const artistDisplay = normalizeArtistDisplay(track.artist);
    const artistKey = artistDisplay.toLowerCase();
    const existingArtist = this.data.artists[artistKey];
    if (existingArtist) {
      existingArtist.playCount += 1;
    } else {
      this.data.artists[artistKey] = {
        artist: artistDisplay,
        playCount: 1,
      };
    }

    // 3. Requester stat (ignore system / autoplay labels)
    const req = track.requester?.trim();
    if (req && !req.startsWith("Autoplay") && req !== "Web") {
      const reqKey = req.toLowerCase();
      const existingReq = this.data.requesters[reqKey];
      if (existingReq) {
        existingReq.nickname = req;
        existingReq.playCount += 1;
      } else {
        this.data.requesters[reqKey] = {
          nickname: req,
          playCount: 1,
        };
      }
    }

    this.saveToDisk();
    return this.getSummary();
  }

  public getSummary(): ListeningStats {
    const topTracks = Object.values(this.data.tracks)
      .sort((a, b) => b.playCount - a.playCount || b.lastPlayedAt - a.lastPlayedAt)
      .slice(0, 10);

    const topArtists = Object.values(this.data.artists)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);

    const topRequesters = Object.values(this.data.requesters)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);

    return {
      totalPlays: this.data.totalPlays,
      totalDurationSeconds: this.data.totalDurationSeconds,
      topTracks,
      topArtists,
      topRequesters,
      updatedAt: this.data.updatedAt,
    };
  }
}
