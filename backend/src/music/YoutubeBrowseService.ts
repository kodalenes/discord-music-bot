import { Innertube } from "youtubei.js";
import type {
  ArtistProfile,
  ArtistSearchResult,
  BrowseSearchResult,
  ExploreFeed,
  LyricsResult,
  PersonalizedTrackRecommendation,
  PlaylistDetails,
  PlaylistSearchResult,
  SearchTrackResult,
  SyncedLyricLine,
} from "../types.js";
import { LastFmService } from "./LastFmService.js";
import {
  normalizeMetaKey,
  type ListeningAnalysisProfile,
} from "./StatsStore.js";

interface RawThumb {
  url?: string;
}

interface RawArtistRef {
  name?: string;
}

interface RawItem {
  id?: string;
  video_id?: string;
  name?: string;
  title?: string | { text?: string };
  subtitle?: { text?: string };
  subscribers?: string;
  item_count?: string | number;
  author?: { name?: string } | string;
  artists?: RawArtistRef[];
  duration?: { seconds?: number; text?: string };
  thumbnails?: RawThumb[];
  thumbnail?: { contents?: RawThumb[] } | RawThumb[];
  endpoint?: { payload?: { browseId?: string; videoId?: string } };
  item_type?: string;
}

function textOf(val: string | { text?: string } | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.text ?? "";
}

function extractThumb(item: RawItem): string {
  if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    return item.thumbnails[item.thumbnails.length - 1]?.url ?? item.thumbnails[0]?.url ?? "";
  }
  if (item.thumbnail) {
    if (Array.isArray(item.thumbnail)) {
      return item.thumbnail[0]?.url ?? "";
    }
    if (Array.isArray(item.thumbnail.contents) && item.thumbnail.contents.length > 0) {
      return item.thumbnail.contents[0]?.url ?? "";
    }
  }
  const vid = item.id || item.video_id;
  if (vid && vid.length === 11) {
    return `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  }
  return "";
}

function parseDurationText(text?: string): number {
  if (!text) return 0;
  const parts = text.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  return 0;
}

function toTrackResult(raw: unknown): SearchTrackResult | null {
  const item = raw as RawItem;
  const id = item.id || item.video_id || item.endpoint?.payload?.videoId;
  if (!id) return null;

  const title = textOf(item.title) || item.name || "Unknown Title";
  const artist =
    item.artists?.map((a) => a.name).filter(Boolean).join(", ") ||
    (typeof item.author === "string" ? item.author : item.author?.name) ||
    textOf(item.subtitle) ||
    "YouTube Music";

  const duration =
    item.duration?.seconds ?? parseDurationText(item.duration?.text);

  return {
    id,
    title,
    artist,
    duration,
    thumbnail: extractThumb(item),
    uri: `https://music.youtube.com/watch?v=${id}`,
  };
}

function toPlaylistResult(raw: unknown, forceAlbum = false): PlaylistSearchResult | null {
  const item = raw as RawItem;
  const id = item.id || item.endpoint?.payload?.browseId;
  if (!id) return null;

  const title = textOf(item.title) || item.name || "Untitled Playlist";
  const author =
    item.artists?.map((a) => a.name).filter(Boolean).join(", ") ||
    (typeof item.author === "string" ? item.author : item.author?.name) ||
    textOf(item.subtitle) ||
    "";

  const isAlbum =
    forceAlbum ||
    item.item_type === "album" ||
    id.startsWith("MPREb") ||
    id.startsWith("OLAK");

  return {
    id,
    title,
    author,
    itemCount: item.item_count !== undefined ? String(item.item_count) : "",
    thumbnail: extractThumb(item),
    isAlbum,
  };
}

export function extractPlaylistId(input: string): string {
  const trimmed = input.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const list = url.searchParams.get("list");
      if (list) return list;
      const browseMatch = url.pathname.match(/\/browse\/([^/?]+)/);
      if (browseMatch?.[1]) return browseMatch[1];
    }
  } catch {
    // Fallback to raw ID
  }
  return trimmed;
}

export class YoutubeBrowseService {
  private ytPromise: Promise<Innertube> | null = null;
  private readonly lastFm = new LastFmService();
  private lyricsCache = new Map<string, LyricsResult | null>();
  private lyricsInFlight = new Map<string, Promise<LyricsResult | null>>();
  private exploreCache: {
    data: { trendingTracks: SearchTrackResult[]; playlists: PlaylistSearchResult[] };
    expiresAt: number;
  } | null = null;
  private personalizedCache: {
    key: string;
    tracks: PersonalizedTrackRecommendation[];
    expiresAt: number;
  } | null = null;
  private recentPersonalizedIds: string[] = [];

  private getClient(): Promise<Innertube> {
    if (!this.ytPromise) {
      this.ytPromise = Innertube.create().catch((err) => {
        this.ytPromise = null;
        throw err;
      });
    }
    return this.ytPromise;
  }

  public async searchAll(query: string): Promise<BrowseSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { tracks: [], artists: [], playlists: [] };
    }

    const yt = await this.getClient();

    const [songRes, artistRes, playlistRes] = await Promise.allSettled([
      yt.music.search(trimmed, { type: "song" }),
      yt.music.search(trimmed, { type: "artist" }),
      yt.music.search(trimmed, { type: "playlist" }),
    ]);

    const tracks: SearchTrackResult[] = [];
    if (songRes.status === "fulfilled") {
      const contents = songRes.value.songs?.contents ?? [];
      for (const item of contents.slice(0, 10)) {
        const parsed = toTrackResult(item);
        if (parsed) tracks.push(parsed);
      }
    }

    const artists: ArtistSearchResult[] = [];
    if (artistRes.status === "fulfilled") {
      const contents = artistRes.value.artists?.contents ?? [];
      for (const raw of contents.slice(0, 6)) {
        const item = raw as unknown as RawItem;
        if (!item.id) continue;
        artists.push({
          id: item.id,
          name: item.name || textOf(item.title) || "Artist",
          subscribers: item.subscribers || "",
          thumbnail: extractThumb(item),
        });
      }
    }

    const playlists: PlaylistSearchResult[] = [];
    if (playlistRes.status === "fulfilled") {
      const contents = playlistRes.value.playlists?.contents ?? [];
      for (const item of contents.slice(0, 8)) {
        const parsed = toPlaylistResult(item, false);
        if (parsed) playlists.push(parsed);
      }
    }

    return { tracks, artists, playlists };
  }

  public async getArtistProfile(artistId: string): Promise<ArtistProfile | null> {
    const yt = await this.getClient();
    const artist = await yt.music.getArtist(artistId);
    const header = artist.header as unknown as
      | {
          title?: { text?: string };
          description?: { text?: string };
          thumbnail?: { contents?: RawThumb[] };
        }
      | undefined;

    const topSongs: SearchTrackResult[] = [];
    const albums: PlaylistSearchResult[] = [];

    for (const sec of artist.sections ?? []) {
      const section = sec as unknown as {
        header?: { title?: { text?: string } };
        type?: string;
        contents?: unknown[];
      };

      const secTitle = (section.header?.title?.text ?? "").toLowerCase();

      if (section.type === "MusicShelf" || secTitle === "songs") {
        for (const item of section.contents ?? []) {
          const parsed = toTrackResult(item);
          if (parsed) topSongs.push(parsed);
        }
      } else if (
        secTitle.includes("album") ||
        secTitle.includes("single") ||
        secTitle.includes("playlist")
      ) {
        const isAlbumSection =
          secTitle.includes("album") || secTitle.includes("single");
        for (const item of section.contents ?? []) {
          const parsed = toPlaylistResult(item, isAlbumSection);
          if (parsed) albums.push(parsed);
        }
      }
    }

    const headerThumbs = header?.thumbnail?.contents ?? [];
    const thumbnail =
      headerThumbs[headerThumbs.length - 1]?.url ?? headerThumbs[0]?.url ?? "";

    return {
      id: artistId,
      name: header?.title?.text ?? "Artist",
      thumbnail,
      description: header?.description?.text ?? "",
      topSongs: topSongs.slice(0, 15),
      albums: albums.slice(0, 16),
    };
  }

  public async getPlaylistDetails(
    idOrUrl: string,
    isAlbum = false
  ): Promise<PlaylistDetails | null> {
    const id = extractPlaylistId(idOrUrl);
    if (!id) return null;

    const yt = await this.getClient();

    if (isAlbum || id.startsWith("MPREb")) {
      try {
        const album = await yt.music.getAlbum(id);
        const header = album.header as unknown as
          | {
              title?: { text?: string };
              author?: { name?: string };
              thumbnail?: { contents?: RawThumb[] };
            }
          | undefined;
        const tracks: SearchTrackResult[] = [];
        for (const item of album.contents ?? []) {
          const parsed = toTrackResult(item);
          if (parsed) tracks.push(parsed);
        }
        const thumbs = header?.thumbnail?.contents ?? [];
        return {
          id,
          title: header?.title?.text ?? "Album",
          author: header?.author?.name ?? "",
          thumbnail: thumbs[thumbs.length - 1]?.url ?? thumbs[0]?.url ?? "",
          isAlbum: true,
          tracks,
        };
      } catch {
        // Fallback to playlist loader below
      }
    }

    // Try YouTube Music playlist first (handles VL... and PL...)
    try {
      let playlist = await yt.music.getPlaylist(id);
      const header = playlist.header as unknown as
        | {
            title?: { text?: string };
            author?: { name?: string };
            thumbnail?: { contents?: RawThumb[] };
            thumbnails?: RawThumb[];
          }
        | undefined;
      const tracks: SearchTrackResult[] = [];
      for (const item of playlist.contents ?? []) {
        const parsed = toTrackResult(item);
        if (parsed) tracks.push(parsed);
      }

      // Fetch remaining pages if playlist has > 100 tracks (cap at 10 pages / ~1000 tracks)
      let pageCount = 1;
      while (playlist.has_continuation && pageCount < 10) {
        playlist = await playlist.getContinuation();
        for (const item of playlist.contents ?? []) {
          const parsed = toTrackResult(item);
          if (parsed) tracks.push(parsed);
        }
        pageCount += 1;
      }

      const thumbs = header?.thumbnail?.contents ?? header?.thumbnails ?? [];
      return {
        id,
        title: header?.title?.text ?? "Çalma Listesi",
        author: header?.author?.name ?? "",
        thumbnail:
          thumbs[thumbs.length - 1]?.url ??
          thumbs[0]?.url ??
          tracks[0]?.thumbnail ??
          "",
        isAlbum: false,
        tracks,
      };
    } catch {
      // Fallback to standard YouTube playlist (handles regular PL... playlists)
      let ytPlaylist = await yt.getPlaylist(id.replace(/^VL/, ""));
      const title = ytPlaylist.info?.title ?? "YouTube Listesi";
      const author = ytPlaylist.info?.author?.name ?? "";
      const initialThumb = ytPlaylist.info?.thumbnails?.[0]?.url ?? "";

      const tracks: SearchTrackResult[] = [];
      const pushItems = (items: unknown[] | undefined) => {
        for (const raw of items ?? []) {
          const item = raw as unknown as RawItem;
          const vid = item.id;
          if (!vid) continue;
          tracks.push({
            id: vid,
            title: textOf(item.title) || "Track",
            artist:
              typeof item.author === "string"
                ? item.author
                : (item.author?.name ?? "YouTube"),
            duration: item.duration?.seconds ?? 0,
            thumbnail: extractThumb(item),
            uri: `https://www.youtube.com/watch?v=${vid}`,
          });
        }
      };

      pushItems(ytPlaylist.items);

      let pageCount = 1;
      while (ytPlaylist.has_continuation && pageCount < 10) {
        ytPlaylist = await ytPlaylist.getContinuation();
        pushItems(ytPlaylist.items);
        pageCount += 1;
      }

      return {
        id,
        title,
        author,
        thumbnail: initialThumb || tracks[0]?.thumbnail || "",
        isAlbum: false,
        tracks,
      };
    }
  }

  public async getLyrics(payload: {
    uri?: string;
    title: string;
    artist: string;
  }): Promise<LyricsResult | null> {
    const cacheKey = `${payload.uri ?? ""}|${payload.title}|${payload.artist}`;
    if (this.lyricsCache.has(cacheKey)) {
      return this.lyricsCache.get(cacheKey) ?? null;
    }

    const existing = this.lyricsInFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.fetchLyricsUncached(payload).then((result) => {
      this.lyricsCache.set(cacheKey, result);
      this.lyricsInFlight.delete(cacheKey);
      // Keep cache bounded to 100 entries
      if (this.lyricsCache.size > 100) {
        const firstKey = this.lyricsCache.keys().next().value;
        if (firstKey !== undefined) this.lyricsCache.delete(firstKey);
      }
      return result;
    });

    this.lyricsInFlight.set(cacheKey, promise);
    return promise;
  }

  private async fetchLyricsUncached(payload: {
    uri?: string;
    title: string;
    artist: string;
  }): Promise<LyricsResult | null> {
    const parseLrc = (lrc: string): SyncedLyricLine[] => {
      const lines: SyncedLyricLine[] = [];
      const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;
      for (const rawLine of lrc.split(/\r?\n/)) {
        const match = rawLine.match(regex);
        if (!match) continue;
        const mins = Number(match[1]);
        const secs = Number(match[2]);
        const msPart = match[3] ? Number(match[3].padEnd(3, "0").slice(0, 3)) : 0;
        const time = mins * 60 + secs + msPart / 1000;
        const text = match[4]?.trim() ?? "";
        if (text) {
          lines.push({ time, text });
        }
      }
      return lines;
    };

    const cleanTitle = payload.title
      .replace(/\(.*?\)|\[.*?\]/g, "")
      .replace(/official\s*(music\s*)?video|lyrics|audio|hd|4k/gi, "")
      .trim();
    const cleanArtist = payload.artist
      .replace(/\s*-\s*Topic$/i, "")
      .trim();

    const fetchLrc = async (url: string) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "TARmusic/1.0" },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return null;
      return (await res.json()) as Array<{
        plainLyrics?: string;
        syncedLyrics?: string;
      }>;
    };

    const fetchYtLyrics = async (): Promise<string | null> => {
      if (!payload.uri) return null;
      const parsed = new URL(payload.uri);
      const videoId = parsed.searchParams.get("v");
      if (!videoId) return null;
      const yt = await this.getClient();
      const shelf = await yt.music.getLyrics(videoId);
      return shelf?.description?.text?.trim() || null;
    };

    const lrcUrl1 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const lrcUrl2 = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`;

    const [lrc1Res, lrc2Res, ytRes] = await Promise.allSettled([
      fetchLrc(lrcUrl1),
      fetchLrc(lrcUrl2),
      fetchYtLyrics(),
    ]);

    const lrcItems = [
      ...(lrc1Res.status === "fulfilled" && Array.isArray(lrc1Res.value)
        ? lrc1Res.value
        : []),
      ...(lrc2Res.status === "fulfilled" && Array.isArray(lrc2Res.value)
        ? lrc2Res.value
        : []),
    ];

    const syncedMatch = lrcItems.find((item) => item.syncedLyrics?.trim());
    if (syncedMatch?.syncedLyrics) {
      const syncedLines = parseLrc(syncedMatch.syncedLyrics);
      if (syncedLines.length > 0) {
        return {
          lyrics:
            syncedMatch.plainLyrics?.trim() ||
            syncedLines.map((l) => l.text).join("\n"),
          syncedLines,
          source: "LRCLIB",
        };
      }
    }

    if (ytRes.status === "fulfilled" && ytRes.value) {
      return { lyrics: ytRes.value, source: "YouTube Music" };
    }

    const plainMatch = lrcItems.find((item) => item.plainLyrics?.trim());
    if (plainMatch?.plainLyrics) {
      return {
        lyrics: plainMatch.plainLyrics.trim(),
        source: "LRCLIB",
      };
    }

    return null;
  }

  public async getExploreFeed(
    analysis?: ListeningAnalysisProfile,
    force = false
  ): Promise<ExploreFeed> {
    const [base, personalizedTracks] = await Promise.all([
      this.getBaseExploreFeed(force),
      this.getPersonalizedRecommendations(analysis, force),
    ]);

    const excludedIds = new Set<string>([
      ...(analysis?.sessionExcludedIds ?? []),
      ...(analysis?.dismissedIds ?? []),
    ]);
    const excludedMeta = new Set<string>([
      ...(analysis?.sessionExcludedMetaKeys ?? []),
      ...(analysis?.dismissedMetaKeys ?? []),
    ]);

    const trendingTracks = base.trendingTracks.filter(
      (t) =>
        !excludedIds.has(t.id) &&
        !excludedMeta.has(normalizeMetaKey(t.title, t.artist))
    );

    return {
      personalizedTracks,
      rediscoverTracks: analysis?.rediscoverTracks ?? [],
      trendingTracks,
      playlists: base.playlists,
    };
  }

  private async getBaseExploreFeed(force = false): Promise<{
    trendingTracks: SearchTrackResult[];
    playlists: PlaylistSearchResult[];
  }> {
    if (!force && this.exploreCache && Date.now() < this.exploreCache.expiresAt) {
      return this.exploreCache.data;
    }

    const yt = await this.getClient();
    const trendingTracks: SearchTrackResult[] = [];
    const playlists: PlaylistSearchResult[] = [];

    try {
      const explore = await yt.music.getExplore();
      const sections = (explore.sections ?? []) as Array<{
        contents?: unknown[];
      }>;

      for (const sec of sections) {
        for (const item of sec.contents ?? []) {
          const track = toTrackResult(item);
          if (track && trendingTracks.length < 18) {
            trendingTracks.push(track);
            continue;
          }
          const pl = toPlaylistResult(item);
          if (pl && playlists.length < 16) {
            playlists.push(pl);
          }
        }
      }
    } catch {
      // Fallback handled below
    }

    if (trendingTracks.length === 0 || playlists.length === 0) {
      const [trendRes, moodRes] = await Promise.allSettled([
        trendingTracks.length === 0
          ? yt.music.search("Top Hits Turkey 2026", { type: "song" })
          : Promise.resolve(null),
        playlists.length === 0
          ? yt.music.search("Chill Gaming Pop", { type: "playlist" })
          : Promise.resolve(null),
      ]);

      if (trendRes.status === "fulfilled" && trendRes.value) {
        const shelf = (trendRes.value as { songs?: { contents?: unknown[] } })
          .songs?.contents;
        for (const item of shelf ?? []) {
          const t = toTrackResult(item);
          if (t && trendingTracks.length < 18) trendingTracks.push(t);
        }
      }

      if (moodRes.status === "fulfilled" && moodRes.value) {
        const shelf = (
          moodRes.value as { playlists?: { contents?: unknown[] } }
        ).playlists?.contents;
        for (const item of shelf ?? []) {
          const p = toPlaylistResult(item);
          if (p && playlists.length < 16) playlists.push(p);
        }
      }
    }

    const data = { trendingTracks, playlists };
    this.exploreCache = { data, expiresAt: Date.now() + 10 * 60 * 1000 };
    return data;
  }

  private shuffleInPlace<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private async getPersonalizedRecommendations(
    analysis?: ListeningAnalysisProfile,
    force = false
  ): Promise<PersonalizedTrackRecommendation[]> {
    if (!analysis || analysis.seedTracks.length === 0) {
      return [];
    }

    const excludedIds = new Set<string>([
      ...analysis.skippedVideoIds,
      ...analysis.dismissedIds,
      ...analysis.sessionExcludedIds,
    ]);
    const excludedMeta = new Set<string>([
      ...analysis.dismissedMetaKeys,
      ...analysis.sessionExcludedMetaKeys,
    ]);

    const cacheKey = `${analysis.currentBucket}:${analysis.seedTracks.map((s) => s.key).join(",")}`;
    if (
      !force &&
      this.personalizedCache &&
      this.personalizedCache.key === cacheKey &&
      Date.now() < this.personalizedCache.expiresAt
    ) {
      return this.personalizedCache.tracks.filter(
        (t) =>
          !excludedIds.has(t.id) &&
          !excludedMeta.has(normalizeMetaKey(t.title, t.artist))
      );
    }

    // Pick up to 4 diverse-artist seeds from the top-10 pool (shuffled on refresh)
    const seedPool = force
      ? this.shuffleInPlace([...analysis.seedTracks])
      : [...analysis.seedTracks];
    const selectedSeeds: typeof analysis.seedTracks = [];
    const seedArtists = new Set<string>();

    for (const s of seedPool) {
      if (selectedSeeds.length >= 4) break;
      const artistKey = s.artist.trim().toLowerCase();
      if (!seedArtists.has(artistKey) || seedPool.length <= 4) {
        selectedSeeds.push(s);
        seedArtists.add(artistKey);
      }
    }
    for (const s of seedPool) {
      if (selectedSeeds.length >= 4) break;
      if (!selectedSeeds.includes(s)) {
        selectedSeeds.push(s);
      }
    }

    const yt = await this.getClient();
    for (const seed of analysis.seedTracks) {
      if (seed.videoId) excludedIds.add(seed.videoId);
    }

    const topArtistSeeds = force
      ? this.shuffleInPlace([...analysis.topArtists]).slice(0, 2)
      : analysis.topArtists.slice(0, 2);

    // Fetch YouTube Music UpNext + Last.fm similar tracks & related artists in parallel
    const [ytResults, lfmTrackResults, lfmArtistResults] = await Promise.all([
      Promise.allSettled(
        selectedSeeds.map(async (seed) => {
          if (!seed.videoId) return { seed, items: [] as SearchTrackResult[] };
          const upNext = await yt.music.getUpNext(seed.videoId, true);
          const contents =
            (upNext as unknown as { contents?: unknown[] }).contents ?? [];
          const items: SearchTrackResult[] = [];
          for (const raw of contents) {
            const parsed = toTrackResult(raw);
            if (parsed) items.push(parsed);
          }
          return { seed, items };
        })
      ),
      Promise.allSettled(
        selectedSeeds.map(async (seed) => ({
          seed,
          items: await this.lastFm.getSimilarTracks(seed.artist, seed.title, 12),
        }))
      ),
      Promise.allSettled(
        topArtistSeeds.map(async (artistName) => ({
          artistName,
          items: await this.lastFm.getSimilarArtists(artistName, 5),
        }))
      ),
    ]);

    // Track Last.fm match boosts & co-occurrence across seeds
    const lfmBoostByMeta = new Map<
      string,
      { title: string; artist: string; match: number; seedTitle: string; count: number }
    >();
    for (const res of lfmTrackResults) {
      if (res.status !== "fulfilled") continue;
      const { seed, items } = res.value;
      for (const lfm of items) {
        const meta = normalizeMetaKey(lfm.title, lfm.artist);
        if (excludedMeta.has(meta)) continue;
        const existing = lfmBoostByMeta.get(meta);
        if (existing) {
          existing.count += 1;
          if (lfm.match > existing.match) {
            existing.match = lfm.match;
            existing.seedTitle = seed.title;
          }
        } else {
          lfmBoostByMeta.set(meta, {
            title: lfm.title,
            artist: lfm.artist,
            match: lfm.match,
            seedTitle: seed.title,
            count: 1,
          });
        }
      }
    }

    // Track YouTube Music candidates and co-occurrence across seeds
    const ytMatchCount = new Map<string, number>();
    for (const res of ytResults) {
      if (res.status !== "fulfilled") continue;
      const seenInSeed = new Set<string>();
      for (const item of res.value.items) {
        if (!item.id || seenInSeed.has(item.id)) continue;
        seenInSeed.add(item.id);
        ytMatchCount.set(item.id, (ytMatchCount.get(item.id) ?? 0) + 1);
      }
    }

    const seenCandidateIds = new Set<string>(excludedIds);
    const seenCandidateMeta = new Set<string>(excludedMeta);
    const artistCounts = new Map<string, number>();

    const coOccurring: PersonalizedTrackRecommendation[] = [];
    const perSeedBuckets: PersonalizedTrackRecommendation[][] = [];

    for (const res of ytResults) {
      if (res.status !== "fulfilled") continue;
      const { seed, items } = res.value;
      const orderedItems = force ? this.shuffleInPlace([...items]) : items;
      const bucket: PersonalizedTrackRecommendation[] = [];

      for (const item of orderedItems) {
        const meta = normalizeMetaKey(item.title, item.artist);
        if (
          !item.id ||
          seenCandidateIds.has(item.id) ||
          seenCandidateMeta.has(meta)
        ) {
          continue;
        }
        seenCandidateIds.add(item.id);
        seenCandidateMeta.add(meta);

        const artistKey = item.artist.trim().toLowerCase();
        const artistCount = artistCounts.get(artistKey) ?? 0;
        if (artistCount >= 2) continue;
        artistCounts.set(artistKey, artistCount + 1);

        const ytHits = ytMatchCount.get(item.id) ?? 1;
        const lfmHit = lfmBoostByMeta.get(meta);
        const totalHits = ytHits + (lfmHit ? 1 : 0);

        let reason = seed.reason;
        let bonus = 0;
        if (ytHits >= 2) {
          reason = `${ytHits} favorinle ortak eşleşme`;
          bonus = ytHits * 5;
        } else if (lfmHit && lfmHit.match > 0.2) {
          reason = `Last.fm • ${lfmHit.seedTitle} (%${Math.round(lfmHit.match * 100)} uyum)`;
          bonus = lfmHit.match * 6;
        }

        const rec: PersonalizedTrackRecommendation = {
          ...item,
          reason,
          score: seed.score + bonus,
        };

        if (totalHits >= 2) {
          coOccurring.push(rec);
        } else {
          bucket.push(rec);
        }
      }

      if (bucket.length > 0) {
        perSeedBuckets.push(bucket);
      }
    }

    // Resolve top Last.fm similar tracks & related-artist tracks not yet in YouTube UpNext
    const unresolvedLfm = Array.from(lfmBoostByMeta.entries())
      .filter(([meta]) => !seenCandidateMeta.has(meta))
      .sort((a, b) => b[1].count - a[1].count || b[1].match - a[1].match)
      .slice(0, force ? 8 : 4);

    const relatedArtistsToExplore: { name: string; sourceArtist: string }[] = [];
    const seenRelatedArtist = new Set(
      analysis.topArtists.map((a) => a.toLowerCase())
    );
    for (const res of lfmArtistResults) {
      if (res.status !== "fulfilled") continue;
      const ordered = force
        ? this.shuffleInPlace([...res.value.items])
        : res.value.items;
      for (const rel of ordered) {
        const lower = rel.name.toLowerCase();
        if (seenRelatedArtist.has(lower)) continue;
        seenRelatedArtist.add(lower);
        relatedArtistsToExplore.push({
          name: rel.name,
          sourceArtist: res.value.artistName,
        });
        if (relatedArtistsToExplore.length >= 3) break;
      }
      if (relatedArtistsToExplore.length >= 3) break;
    }

    const searchQueries: Array<{ query: string; reason: string; bonus: number }> =
      [
        ...(force ? this.shuffleInPlace(unresolvedLfm) : unresolvedLfm)
          .slice(0, 4)
          .map(([, info]) => ({
            query: `${info.artist} ${info.title}`,
            reason:
              info.count >= 2
                ? `Last.fm • ${info.count} favorinle ortak`
                : `Last.fm • ${info.seedTitle} (%${Math.round(info.match * 100)} uyum)`,
            bonus: info.count * 4 + info.match * 5,
          })),
        ...relatedArtistsToExplore.slice(0, 2).map((rel) => ({
          query: `${rel.name} top song`,
          reason: `Benzer sanatçı: ${rel.sourceArtist}`,
          bonus: 4,
        })),
      ];

    const resolvedExternal: PersonalizedTrackRecommendation[] = [];
    if (searchQueries.length > 0) {
      const searchResults = await Promise.allSettled(
        searchQueries.map(async (q) => {
          const res = await yt.music.search(q.query, { type: "song" });
          const contents =
            (res as unknown as { songs?: { contents?: unknown[] } }).songs
              ?.contents ?? [];
          for (const raw of contents) {
            const parsed = toTrackResult(raw);
            if (parsed) return { track: parsed, reason: q.reason, bonus: q.bonus };
          }
          return null;
        })
      );

      for (const r of searchResults) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const { track, reason, bonus } = r.value;
        const meta = normalizeMetaKey(track.title, track.artist);
        if (
          seenCandidateIds.has(track.id) ||
          seenCandidateMeta.has(meta)
        ) {
          continue;
        }
        seenCandidateIds.add(track.id);
        seenCandidateMeta.add(meta);

        const artistKey = track.artist.trim().toLowerCase();
        const artistCount = artistCounts.get(artistKey) ?? 0;
        if (artistCount >= 2) continue;
        artistCounts.set(artistKey, artistCount + 1);

        resolvedExternal.push({
          ...track,
          reason,
          score: 8 + bonus,
        });
      }
    }

    // Round-robin interleave YouTube UpNext buckets
    const interleaved: PersonalizedTrackRecommendation[] = [];
    let round = 0;
    while (interleaved.length < 40) {
      let addedInRound = false;
      for (const bucket of perSeedBuckets) {
        if (round < bucket.length) {
          interleaved.push(bucket[round]);
          addedInRound = true;
        }
      }
      if (!addedInRound) break;
      round += 1;
    }

    // Blend: co-occurring + Last.fm/related-artist gems + fresh UpNext + familiar
    coOccurring.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const orderedPool = [...coOccurring, ...resolvedExternal, ...interleaved];

    const recentSet = new Set(this.recentPersonalizedIds);
    const freshNew: PersonalizedTrackRecommendation[] = [];
    const familiarNew: PersonalizedTrackRecommendation[] = [];
    const previouslyShown: PersonalizedTrackRecommendation[] = [];

    for (const rec of orderedPool) {
      if (force && recentSet.has(rec.id)) {
        previouslyShown.push(rec);
      } else if (analysis.allTrackedVideoIds.has(rec.id)) {
        familiarNew.push(rec);
      } else {
        freshNew.push(rec);
      }
    }

    const combined = [...freshNew, ...familiarNew, ...previouslyShown].slice(
      0,
      12
    );

    if (combined.length > 0) {
      this.recentPersonalizedIds = [
        ...combined.map((c) => c.id),
        ...this.recentPersonalizedIds.filter(
          (id) => !combined.some((c) => c.id === id)
        ),
      ].slice(0, 36);
    }

    this.personalizedCache = {
      key: cacheKey,
      tracks: combined,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    return combined;
  }

  public async getSimilarTracks(payload: {
    uri?: string;
    title: string;
    artist: string;
    excludeIds?: string[];
  }): Promise<SearchTrackResult[]> {
    const yt = await this.getClient();
    let seedVideoId: string | null = null;

    if (payload.uri) {
      try {
        const parsed = new URL(payload.uri);
        seedVideoId = parsed.searchParams.get("v");
      } catch {
        // Ignore invalid URL
      }
    }

    if (!seedVideoId) {
      const searchRes = await yt.music.search(
        `${payload.title} ${payload.artist}`.trim(),
        { type: "song" }
      );
      const first = searchRes.songs?.contents?.[0];
      const parsedFirst = first ? toTrackResult(first) : null;
      seedVideoId = parsedFirst?.id ?? null;
    }

    if (!seedVideoId) return [];

    const excludeSet = new Set(payload.excludeIds ?? []);
    excludeSet.add(seedVideoId);

    const results: SearchTrackResult[] = [];
    try {
      const upNext = await yt.music.getUpNext(seedVideoId, true);
      for (const item of upNext.contents ?? []) {
        const track = toTrackResult(item);
        if (!track || excludeSet.has(track.id)) continue;
        excludeSet.add(track.id);
        results.push(track);
        if (results.length >= 5) break;
      }
    } catch {
      // Fallback to artist top songs if getUpNext fails
    }

    if (results.length === 0 && payload.artist) {
      const fallback = await yt.music.search(payload.artist, { type: "song" });
      for (const item of fallback.songs?.contents ?? []) {
        const track = toTrackResult(item);
        if (!track || excludeSet.has(track.id)) continue;
        excludeSet.add(track.id);
        results.push(track);
        if (results.length >= 5) break;
      }
    }

    return results;
  }
}
