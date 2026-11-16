import {
  ArrowLeft,
  Play,
  Plus,
  ListMusic,
  Loader2,
  Bookmark,
  CopyPlus,
} from "lucide-react";
import type { PlaylistDetails } from "../types";
import { formatDuration } from "../utils";
import { useTrackMenu } from "./TrackContextMenu";

interface PlaylistViewProps {
  details: PlaylistDetails | null;
  isLoading: boolean;
  onBack: () => void;
  onAddTrack: (uri: string) => void;
  onAddAll: (uris: string[]) => void;
  onPlayNow: (uri: string) => void;
  onSavePlaylist?: (idOrUrl: string) => void;
  onCloneAsCustomPlaylist?: (details: PlaylistDetails) => void;
}

export function PlaylistView({
  details,
  isLoading,
  onBack,
  onAddTrack,
  onAddAll,
  onPlayNow,
  onSavePlaylist,
  onCloneAsCustomPlaylist,
}: PlaylistViewProps) {
  const { openTrackMenu } = useTrackMenu();
  if (isLoading) {
    return (
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[340px] gap-3 text-neutral-400">
        <Loader2 className="w-7 h-7 animate-spin text-red-500" />
        <span className="text-sm">Çalma listesi yükleniyor...</span>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] gap-4 text-neutral-400">
        <p className="text-sm">Çalma listesi yüklenemedi.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl">
      <div className="relative p-6 bg-gradient-to-b from-neutral-800/40 to-[#121212] border-b border-white/5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-neutral-300 hover:text-white text-xs font-medium mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Geri Dön
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-neutral-800 shrink-0 shadow-2xl border border-white/10">
            {details.thumbnail ? (
              <img
                src={details.thumbnail}
                alt={details.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <ListMusic className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-red-400">
              {details.isAlbum ? "Albüm" : "Çalma Listesi"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate mt-0.5">
              {details.title}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {[details.author, `${details.tracks.length} şarkı`]
                .filter(Boolean)
                .join(" • ")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {details.tracks.length > 0 && (
                <>
                  <button
                    onClick={() => onPlayNow(details.tracks[0].uri)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Baştan Çal
                  </button>
                  <button
                    onClick={() =>
                      onAddAll(details.tracks.map((track) => track.uri))
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tümünü Sıraya Ekle
                  </button>
                </>
              )}
              {onSavePlaylist && !details.isAlbum && (
                <button
                  onClick={() => onSavePlaylist(details.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Listelerime Kaydet
                </button>
              )}
              {onCloneAsCustomPlaylist && details.tracks.length > 0 && (
                <button
                  onClick={() => onCloneAsCustomPlaylist(details)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                  Düzenlenebilir Olarak Kopyala
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="p-4 sm:p-6">
        {details.tracks.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 py-8">
            Bu listede şarkı bulunamadı.
          </p>
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            {details.tracks.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                onContextMenu={(e) => openTrackMenu(e, track)}
                className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/5 transition-colors group"
              >
                <span className="w-5 text-center text-xs text-neutral-500 font-mono">
                  {idx + 1}
                </span>
                <button
                  onClick={() => onPlayNow(track.uri)}
                  className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 cursor-pointer group/thumb"
                  title="Şimdi Çal"
                >
                  {track.thumbnail && (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">
                    {track.artist}
                    {track.duration > 0
                      ? ` • ${formatDuration(track.duration)}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => onPlayNow(track.uri)}
                  className="p-2 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all cursor-pointer"
                  title="Şimdi Çal"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  onClick={() => onAddTrack(track.uri)}
                  className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold transition-all cursor-pointer"
                  title="Kuyruğa Ekle"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
