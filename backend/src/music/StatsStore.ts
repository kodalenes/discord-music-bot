import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ListeningStats,
  PersonalizedTrackRecommendation,
  QueueTrack,
  TopArtistStat,
  TopRequesterStat,
  TopTrackStat,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "stats.json");

export type TimeBucket = "morning" | "afternoon" | "evening" | "night";

interface StoredTrackStat extends TopTrackStat {
  skipCount?: number;
  completedCount?: number;
  timeBuckets?: Record<TimeBucket, number>;
}

interface RawStatsData {
  totalPlays: number;
  totalDurationSeconds: number;
  tracks: Record<string, StoredTrackStat>;
  artists: Record<string, TopArtistStat>;
  requesters: Record<string, TopRequesterStat>;
  updatedAt: number;
}

export interface SeedTrackAnalysis {
  key: string;
  videoId: string | null;
  title: string;
  artist: string;
  uri: string;
  reason: string;
  score: number;
}

export interface ListeningAnalysisProfile {
  seedTracks: SeedTrackAnalysis[];
  rediscoverTracks: PersonalizedTrackRecommendation[];
  skippedVideoIds: Set<string>;
  sessionExcludedIds: Set<string>;
  sessionExcludedMetaKeys: Set<string>;
  allTrackedVideoIds: Set<string>;
  topArtists: string[];
  currentBucket: TimeBucket;
}

const DEFAULT_DATA: RawStatsData = {
  totalPlays: 0,
  totalDurationSeconds: 0,
  tracks: {},
  artists: {},
  requesters: {},
  updatedAt: 0,
};

function getTimeBucket(date = new Date()): TimeBucket {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 24) return "evening";
  return "night";
}

function getBucketLabelTr(bucket: TimeBucket): string {
  switch (bucket) {
    case "morning":
      return "Sabah";
    case "afternoon":
      return "Öğle";
    case "evening":
      return "Akşam";
    case "night":
      return "Gece";
  }
}

export function extractVideoId(uri?: string): string | null {
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    const v = parsed.searchParams.get("v");
    if (v) return v;
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\/+/, "");
      if (id) return id;
    }
  } catch {
    // Ignore malformed URI
  }
  return null;
}

export function normalizeMetaKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
}

function extractTrackKey(track: QueueTrack): string {
  const uri = track.uri?.trim() ?? "";
  const videoId = extractVideoId(uri);
  if (videoId) return `yt:${videoId}`;
  if (uri) return `uri:${uri}`;
  return `meta:${normalizeMetaKey(track.title, track.artist)}`;
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
          tracks:
            parsed.tracks && typeof parsed.tracks === "object"
              ? parsed.tracks
              : {},
          artists:
            parsed.artists && typeof parsed.artists === "object"
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
    const bucket = getTimeBucket(new Date(now));

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
      const buckets = existingTrack.timeBuckets ?? {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
      };
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
      existingTrack.timeBuckets = buckets;
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
        skipCount: 0,
        completedCount: 0,
        timeBuckets: {
          morning: bucket === "morning" ? 1 : 0,
          afternoon: bucket === "afternoon" ? 1 : 0,
          evening: bucket === "evening" ? 1 : 0,
          night: bucket === "night" ? 1 : 0,
        },
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

  public recordSkip(track: QueueTrack, playedSeconds: number): void {
    // Only count as an early skip if user skipped within 30s (or < 35% of track)
    const threshold = Math.min(30, Math.max(10, Math.floor(track.duration * 0.35)));
    if (playedSeconds > threshold) return;

    const trackKey = extractTrackKey(track);
    const entry = this.data.tracks[trackKey];
    if (!entry) return;

    entry.skipCount = (entry.skipCount ?? 0) + 1;
    this.data.updatedAt = Date.now();
    this.saveToDisk();
  }

  public recordComplete(track: QueueTrack): void {
    const trackKey = extractTrackKey(track);
    const entry = this.data.tracks[trackKey];
    if (!entry) return;

    entry.completedCount = (entry.completedCount ?? 0) + 1;
    this.data.updatedAt = Date.now();
    this.saveToDisk();
  }

  public getAnalysisProfile(sessionExcluded?: {
    videoIds: Set<string>;
    metaKeys: Set<string>;
  }): ListeningAnalysisProfile {
    const sessionExcludedIds = sessionExcluded?.videoIds ?? new Set<string>();
    const sessionExcludedMetaKeys =
      sessionExcluded?.metaKeys ?? new Set<string>();
    const now = Date.now();
    const currentBucket = getTimeBucket(new Date(now));
    const bucketLabel = getBucketLabelTr(currentBucket);
    const allTracks = Object.values(this.data.tracks);

    const skippedVideoIds = new Set<string>();
    const allTrackedVideoIds = new Set<string>();

    const scored = allTracks.map((t) => {
      const videoId = extractVideoId(t.uri);
      if (videoId) allTrackedVideoIds.add(videoId);

      const skips = t.skipCount ?? 0;
      const completions = t.completedCount ?? 0;
      const daysSince = Math.max(0, (now - t.lastPlayedAt) / (1000 * 60 * 60 * 24));

      if (videoId && skips >= 2 && skips > completions) {
        skippedVideoIds.add(videoId);
      }

      // Frequency + completion reward - skip penalty
      const baseAffinity = t.playCount * 2 + completions * 1.5 - skips * 2.5;
      // Time-of-day match boost
      const bucketCount = t.timeBuckets?.[currentBucket] ?? 0;
      const timeBoost = bucketCount > 0 ? Math.min(4, bucketCount * 1.2) : 0;
      // Recency decay (still keeps all-time favorites strong)
      const recencyFactor = 1 / (1 + daysSince * 0.05);

      const seedScore = Math.max(0, (baseAffinity + timeBoost) * (0.65 + 0.35 * recencyFactor));

      // Rediscovery score: played multiple times, low skips, not played very recently
      const skipRatio = t.playCount > 0 ? skips / t.playCount : 0;
      const isGoodRediscoverCandidate =
        skipRatio < 0.5 && (daysSince >= 1 || allTracks.length <= 12);
      const rediscoverScore = isGoodRediscoverCandidate
        ? t.playCount * (1 + Math.min(14, daysSince) * 0.35) + completions
        : 0;

      let reason = `${t.title} dinlediğin için`;
      if (bucketCount >= 2) {
        reason = `${bucketLabel} favorin ${t.title} tarzında`;
      } else if (completions >= 2) {
        reason = `Sık dinlediğin ${t.title} benzeri`;
      }

      return {
        track: t,
        videoId,
        seedScore,
        rediscoverScore,
        daysSince,
        reason,
      };
    });

    const seedTracks: SeedTrackAnalysis[] = scored
      .filter((s) => s.seedScore > 0 && (s.videoId !== null || Boolean(s.track.uri)))
      .sort((a, b) => b.seedScore - a.seedScore)
      .slice(0, 10)
      .map((s) => ({
        key: s.track.key,
        videoId: s.videoId,
        title: s.track.title,
        artist: normalizeArtistDisplay(s.track.artist),
        uri: s.track.uri,
        reason: s.reason,
        score: Math.round(s.seedScore * 10) / 10,
      }));

    const rediscoverTracks: PersonalizedTrackRecommendation[] = scored
      .filter((s) => {
        if (s.rediscoverScore <= 0 || !s.track.uri) return false;
        if (s.videoId && sessionExcludedIds.has(s.videoId)) return false;
        if (
          sessionExcludedMetaKeys.has(
            normalizeMetaKey(s.track.title, s.track.artist)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.rediscoverScore - a.rediscoverScore)
      .slice(0, 8)
      .map((s) => {
        const daysRounded = Math.floor(s.daysSince);
        const ageNote =
          daysRounded >= 2
            ? `${daysRounded} gündür çalınmadı`
            : s.track.playCount >= 2
              ? `${s.track.playCount}x dinledin`
              : "Dinleme geçmişinden";
        return {
          id: s.videoId || s.track.key,
          title: s.track.title,
          artist: s.track.artist,
          duration: s.track.duration,
          thumbnail: s.track.thumbnail,
          uri: s.track.uri,
          reason: `${s.track.playCount}x çalındı • ${ageNote}`,
          score: Math.round(s.rediscoverScore * 10) / 10,
        };
      });

    const topArtists = Object.values(this.data.artists)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5)
      .map((a) => a.artist);

    return {
      seedTracks,
      rediscoverTracks,
      skippedVideoIds,
      sessionExcludedIds,
      sessionExcludedMetaKeys,
      allTrackedVideoIds,
      topArtists,
      currentBucket,
    };
  }

  public getSummary(): ListeningStats {
    const topTracks = Object.values(this.data.tracks)
      .sort((a, b) => b.playCount - a.playCount || b.lastPlayedAt - a.lastPlayedAt)
      .slice(0, 10)
      .map((t) => ({
        key: t.key,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        uri: t.uri,
        duration: t.duration,
        playCount: t.playCount,
        lastPlayedAt: t.lastPlayedAt,
      }));

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
