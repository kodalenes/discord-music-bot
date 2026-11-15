import { Innertube } from "youtubei.js";
import type {
  ArtistProfile,
  ArtistSearchResult,
  BrowseSearchResult,
  PlaylistDetails,
  PlaylistSearchResult,
  SearchTrackResult,
} from "../types.js";

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
}
