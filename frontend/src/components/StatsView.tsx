import {
  BarChart3,
  Clock,
  Crown,
  Disc3,
  Flame,
  Music2,
  Play,
  Plus,
  UserCheck,
} from "lucide-react";
import type { ListeningStats } from "../types";
import { formatDuration } from "../utils";

interface StatsViewProps {
  stats: ListeningStats;
  sessionPlayCount: number;
  onPlayNow: (uri: string) => void;
  onAddTrack: (uri: string) => void;
}

function formatTotalListeningTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 dk";
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} sa ${mins} dk`;
  if (mins > 0) return `${mins} dk`;
  return `${Math.floor(totalSeconds)} sn`;
}

export function StatsView({
  stats,
  sessionPlayCount,
  onPlayNow,
  onAddTrack,
}: StatsViewProps) {
  const topTrack = stats.topTracks[0] ?? null;
  const topRequester = stats.topRequesters[0] ?? null;
  const maxArtistCount = stats.topArtists[0]?.playCount || 1;
  const maxRequesterCount = stats.topRequesters[0]?.playCount || 1;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-red-400" />
          <div>
            <h1 className="text-lg font-bold text-white">
              Dinleme İstatistikleri
            </h1>
            <p className="text-xs text-neutral-400">
              Sunucu genelinde kalıcı olarak kaydedilen müzik istatistikleri
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
          Bu oturum: {sessionPlayCount} şarkı
        </span>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Toplam Çalınan</span>
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {stats.totalPlays}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">tüm zamanlar</p>
        </div>

        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Toplam Süre</span>
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {formatTotalListeningTime(stats.totalDurationSeconds)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">dinleme süresi</p>
        </div>

        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Favori Şarkı</span>
          </div>
          <p className="text-sm font-bold text-white truncate">
            {topTrack ? topTrack.title : "—"}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
            {topTrack ? `${topTrack.playCount} kez çalındı` : "Henüz veri yok"}
          </p>
        </div>

        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1.5">
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>En Aktif DJ</span>
          </div>
          <p className="text-sm font-bold text-white truncate">
            {topRequester ? topRequester.nickname : "—"}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
            {topRequester
              ? `${topRequester.playCount} şarkı çaldırdı`
              : "Henüz veri yok"}
          </p>
        </div>
      </div>

      {/* Top 10 Most Played Tracks */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white">
              En Çok Dinlenen Şarkılar
            </h2>
          </div>
          <span className="text-[11px] text-neutral-500">İlk 10</span>
        </div>

        {stats.topTracks.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500">
            Henüz şarkı istatistiği birikmedi. Şarkı çaldıkça burada listelenecek.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {stats.topTracks.map((track, idx) => {
              const rankColor =
                idx === 0
                  ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                  : idx === 1
                    ? "text-neutral-200 bg-white/10 border-white/15"
                    : idx === 2
                      ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                      : "text-neutral-400 bg-white/[0.03] border-white/5";

              return (
                <div
                  key={track.key}
                  className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <span
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold font-mono shrink-0 ${rankColor}`}
                  >
                    {idx + 1}
                  </span>

                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/5">
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
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {track.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20 font-mono">
                      {track.playCount}x
                    </span>
                    <span className="hidden sm:inline text-xs text-neutral-500 font-mono w-10 text-right">
                      {formatDuration(track.duration)}
                    </span>
                    {track.uri && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onPlayNow(track.uri)}
                          className="p-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                          title="Hemen Çal"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => onAddTrack(track.uri)}
                          className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                          title="Kuyruğa Ekle"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: Top Artists & Top DJs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-3">
            En Çok Dinlenen Sanatçılar
          </h3>
          {stats.topArtists.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4">Henüz veri yok.</p>
          ) : (
            <div className="space-y-3">
              {stats.topArtists.map((item) => {
                const pct = Math.max(
                  8,
                  Math.round((item.playCount / maxArtistCount) * 100)
                );
                return (
                  <div key={item.artist} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-200 font-medium truncate pr-2">
                        {item.artist}
                      </span>
                      <span className="text-neutral-400 font-mono shrink-0">
                        {item.playCount} çalma
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-white mb-3">
            En Aktif DJ&apos;ler
          </h3>
          {stats.topRequesters.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4">
              Takma adıyla şarkı ekleyen kullanıcılar burada görünecek.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topRequesters.map((item) => {
                const pct = Math.max(
                  8,
                  Math.round((item.playCount / maxRequesterCount) * 100)
                );
                return (
                  <div key={item.nickname} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-200 font-medium truncate pr-2">
                        {item.nickname}
                      </span>
                      <span className="text-neutral-400 font-mono shrink-0">
                        {item.playCount} şarkı
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
