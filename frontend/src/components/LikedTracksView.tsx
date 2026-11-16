import { Disc3, Heart, ListPlus, Play, Plus } from "lucide-react";
import type { LikedTrack } from "../types";
import { formatDuration } from "../utils";

interface LikedTracksViewProps {
  tracks: LikedTrack[];
  onPlayNow: (uri: string) => void;
  onPlayNext: (uri: string) => void;
  onAddTrack: (uri: string) => void;
  onAddAll: (uris: string[]) => void;
  onToggleLike: (track: LikedTrack) => void;
}

export function LikedTracksView({
  tracks,
  onPlayNow,
  onPlayNext,
  onAddTrack,
  onAddAll,
  onToggleLike,
}: LikedTracksViewProps) {
  const validUris = tracks.map((t) => t.uri).filter(Boolean);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      <div className="bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Beğenilen Şarkılar
              </h1>
              <p className="text-xs text-neutral-400">
                {tracks.length} şarkı • Kalıcı olarak kaydedilir
              </p>
            </div>
          </div>

          {validUris.length > 0 && (
            <button
              onClick={() => onAddAll(validUris)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tümünü Kuyruğa Ekle</span>
            </button>
          )}
        </div>

        {tracks.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Heart className="w-10 h-10 text-neutral-700 mx-auto" />
            <p className="text-sm text-neutral-400">
              Henüz beğendiğiniz bir şarkı yok.
            </p>
            <p className="text-xs text-neutral-500">
              Oynatıcıdaki ♥ kalp ikonuna basarak şarkıları burada toplayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
              >
                <button
                  onClick={() => track.uri && onPlayNow(track.uri)}
                  className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/5 cursor-pointer"
                  title="Hemen Çal"
                >
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-4 h-4 text-neutral-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </button>

                <button
                  onClick={() => track.uri && onPlayNow(track.uri)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                  title="Hemen Çal"
                >
                  <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">
                    {track.artist}
                    {track.duration > 0
                      ? ` • ${formatDuration(track.duration)}`
                      : ""}
                  </p>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  {track.uri && (
                    <>
                      <button
                        onClick={() => onPlayNext(track.uri)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        title="Sıradaki Olarak Çal"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAddTrack(track.uri)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white text-neutral-300 hover:text-black transition-colors cursor-pointer"
                        title="Kuyruğa Ekle"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onToggleLike(track)}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Beğenilerden Kaldır"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
