import type { DislikedTrack, LikedTrack } from "./types";

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const floored = Math.floor(seconds);
  const hrs = Math.floor(floored / 3600);
  const mins = Math.floor((floored % 3600) / 60);
  const secs = floored % 60;

  const paddedSecs = secs.toString().padStart(2, "0");
  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, "0");
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

export function normalizeTrackMatchKey(track: {
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
  return `meta:${track.title.trim().toLowerCase()}::${track.artist.trim().toLowerCase()}`;
}

export function isTrackLiked(
  likedTracks: LikedTrack[],
  track: { uri?: string; title: string; artist: string } | null
): boolean {
  if (!track) return false;
  const key = normalizeTrackMatchKey(track);
  return likedTracks.some(
    (item) => item.id === key || normalizeTrackMatchKey(item) === key
  );
}

export function isTrackDisliked(
  dislikedTracks: DislikedTrack[],
  track: { uri?: string; title: string; artist: string } | null
): boolean {
  if (!track) return false;
  const key = normalizeTrackMatchKey(track);
  return dislikedTracks.some(
    (item) => item.id === key || normalizeTrackMatchKey(item) === key
  );
}
