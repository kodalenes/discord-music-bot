import { config } from "../config.js";

export interface LastFmSimilarTrack {
  title: string;
  artist: string;
  match: number; // 0..1
}

export interface LastFmSimilarArtist {
  name: string;
  match: number; // 0..1
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

function cleanArtistForLastFm(artist: string): string {
  return artist
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/\s*VEVO$/i, "")
    .replace(/\s*\(Official.*?\)/gi, "")
    .trim();
}

function cleanTitleForLastFm(title: string): string {
  return title
    .replace(/\s*\((official\s*(music\s*)?video|audio|lyrics|lyric\s*video|hd|4k|live)\)/gi, "")
    .replace(/\s*\[(official\s*(music\s*)?video|audio|lyrics|lyric\s*video|hd|4k|live)\]/gi, "")
    .trim();
}

export class LastFmService {
  private trackCache = new Map<string, CacheEntry<LastFmSimilarTrack[]>>();
  private artistCache = new Map<string, CacheEntry<LastFmSimilarArtist[]>>();

  public isEnabled(): boolean {
    return Boolean(config.lastfmApiKey);
  }

  private async callApi<T>(params: Record<string, string>): Promise<T | null> {
    if (!config.lastfmApiKey) return null;

    const url = new URL(BASE_URL);
    url.searchParams.set("api_key", config.lastfmApiKey);
    url.searchParams.set("format", "json");
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  public async getSimilarTracks(
    artist: string,
    title: string,
    limit = 15
  ): Promise<LastFmSimilarTrack[]> {
    if (!this.isEnabled()) return [];

    const cleanArtist = cleanArtistForLastFm(artist);
    const cleanTitle = cleanTitleForLastFm(title);
    if (!cleanArtist || !cleanTitle) return [];

    const cacheKey = `${cleanArtist.toLowerCase()}::${cleanTitle.toLowerCase()}`;
    const cached = this.trackCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    interface RawResponse {
      similartracks?: {
        track?: Array<{
          name?: string;
          match?: number | string;
          artist?: { name?: string };
        }>;
      };
    }

    const json = await this.callApi<RawResponse>({
      method: "track.getsimilar",
      artist: cleanArtist,
      track: cleanTitle,
      autocorrect: "1",
      limit: String(limit),
    });

    const rawTracks = json?.similartracks?.track;
    const parsed: LastFmSimilarTrack[] = Array.isArray(rawTracks)
      ? rawTracks
          .map((t) => ({
            title: t.name?.trim() ?? "",
            artist: t.artist?.name?.trim() ?? "",
            match: Number(t.match ?? 0) || 0,
          }))
          .filter((t) => Boolean(t.title && t.artist))
      : [];

    this.trackCache.set(cacheKey, {
      data: parsed,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return parsed;
  }

  public async getSimilarArtists(
    artist: string,
    limit = 6
  ): Promise<LastFmSimilarArtist[]> {
    if (!this.isEnabled()) return [];

    const cleanArtist = cleanArtistForLastFm(artist);
    if (!cleanArtist) return [];

    const cacheKey = cleanArtist.toLowerCase();
    const cached = this.artistCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    interface RawResponse {
      similarartists?: {
        artist?: Array<{
          name?: string;
          match?: number | string;
        }>;
      };
    }

    const json = await this.callApi<RawResponse>({
      method: "artist.getsimilar",
      artist: cleanArtist,
      autocorrect: "1",
      limit: String(limit),
    });

    const rawArtists = json?.similarartists?.artist;
    const parsed: LastFmSimilarArtist[] = Array.isArray(rawArtists)
      ? rawArtists
          .map((a) => ({
            name: a.name?.trim() ?? "",
            match: Number(a.match ?? 0) || 0,
          }))
          .filter((a) => Boolean(a.name))
      : [];

    this.artistCache.set(cacheKey, {
      data: parsed,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return parsed;
  }
}
