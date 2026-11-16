import {
  Flame,
  ListMusic,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { ExploreFeed, SearchResult } from "../types";
import { formatDuration } from "../utils";

interface ExploreViewProps {
  feed: ExploreFeed | null;
  isLoading: boolean;
  onRefresh: () => void;
  onPlayNow: (uri: string) => void;
  onAddTrack: (uri: string) => void;
  onOpenPlaylist: (id: string, isAlbum: boolean) => void;
}

interface ExploreTrackCardProps {
  track: SearchResult & { reason?: string };
  reasonTone?: "amber" | "sky";
  onPlayNow: (uri: string) => void;
  onAddTrack: (uri: string) => void;
}

function ExploreTrackCard({
  track,
  reasonTone = "amber",
  onPlayNow,
  onAddTrack,
}: ExploreTrackCardProps) {
  const badgeClass =
    reasonTone === "sky"
      ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
      : "bg-amber-500/10 text-amber-300 border-amber-500/20";

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-colors group">
      <button
        onClick={() => onPlayNow(track.uri)}
        className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0 cursor-pointer group/thumb"
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

      <button
        onClick={() => onPlayNow(track.uri)}
        className="min-w-0 flex-1 text-left cursor-pointer"
        title="Şimdi Çal"
      >
        <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
          {track.title}
        </p>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {track.artist}
          {track.duration > 0 ? ` • ${formatDuration(track.duration)}` : ""}
        </p>
        {track.reason && (
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border max-w-full truncate ${badgeClass}`}
          >
            {track.reason}
          </span>
        )}
      </button>

      <button
        onClick={() => onAddTrack(track.uri)}
        className="p-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all cursor-pointer shrink-0"
        title="Kuyruğa Ekle"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ExploreView({
  feed,
  isLoading,
  onRefresh,
  onPlayNow,
  onAddTrack,
  onOpenPlaylist,
}: ExploreViewProps) {
  if (isLoading) {
    return (
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center min-h-[340px] gap-3 text-neutral-400">
        <Loader2 className="w-7 h-7 animate-spin text-red-500" />
        <span className="text-sm">
          Dinleme geçmişin analiz ediliyor ve öneriler hazırlanıyor...
        </span>
      </div>
    );
  }

  const personalized = feed?.personalizedTracks ?? [];
  const rediscover = feed?.rediscoverTracks ?? [];
  const trending = feed?.trendingTracks ?? [];

  return (
    <div className="space-y-6">
      {/* Personalized Recommendations */}
      <section className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Dinlediklerinize Göre
              </h2>
              <p className="text-xs text-neutral-400">
                Çalma sıklığı, tamamlanma oranı ve saat dilimine göre seçildi
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>
        </div>

        {personalized.length === 0 ? (
          <p className="text-sm text-neutral-500 py-6 text-center">
            Dinleme geçmişiniz oluştukça burada zevkinize göre yeni şarkılar önerilecek.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {personalized.map((track) => (
              <ExploreTrackCard
                key={`p-${track.id}`}
                track={track}
                reasonTone="amber"
                onPlayNow={onPlayNow}
                onAddTrack={onAddTrack}
              />
            ))}
          </div>
        )}
      </section>

      {/* Rediscover All-Time Favorites */}
      {rediscover.length > 0 && (
        <section className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Tekrar Keşfet
              </h2>
              <p className="text-xs text-neutral-400">
                Tüm zamanlarda sevdiğiniz ve tekrar çalmak isteyebileceğiniz şarkılar
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rediscover.map((track) => (
              <ExploreTrackCard
                key={`r-${track.id}`}
                track={track}
                reasonTone="sky"
                onPlayNow={onPlayNow}
                onAddTrack={onAddTrack}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Tracks */}
      <section className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-red-500" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Trend Şarkılar
          </h2>
        </div>

        {trending.length === 0 ? (
          <p className="text-sm text-neutral-500 py-8 text-center">
            Şu an trend şarkı bulunamadı.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {trending.map((track) => (
              <ExploreTrackCard
                key={`t-${track.id}`}
                track={track}
                onPlayNow={onPlayNow}
                onAddTrack={onAddTrack}
              />
            ))}
          </div>
        )}
      </section>

      {/* Featured Playlists & Moods */}
      {feed && feed.playlists.length > 0 && (
        <section className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <ListMusic className="w-5 h-5 text-red-500" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Öne Çıkan Listeler & Ruh Halleri
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {feed.playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => onOpenPlaylist(pl.id, pl.isAlbum)}
                className="text-left p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer group"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-2">
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <ListMusic className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                  {pl.title}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {pl.author || "YouTube Music"}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
