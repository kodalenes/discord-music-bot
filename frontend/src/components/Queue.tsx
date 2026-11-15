import { useState } from "react";
import {
  Trash2,
  ChevronUp,
  ChevronDown,
  Disc3,
  Music,
  Radio,
  Play,
  GripVertical,
  History,
  Clock,
  BarChart3,
} from "lucide-react";
import type { Track } from "../types";
import { formatDuration } from "../utils";

function formatTotalDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 dk";
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours} sa ${mins} dk`;
  if (mins > 0) return `${mins} dk ${secs} sn`;
  return `${secs} sn`;
}

interface QueueProps {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  sessionPlayCount: number;
  isPlaying: boolean;
  onRemoveTrack: (trackId: string) => void;
  onMoveTrack: (trackId: string, direction: "up" | "down") => void;
  onReorderTrack: (fromIndex: number, toIndex: number) => void;
  onPlayNow: (trackId: string) => void;
}

export function Queue({
  currentTrack,
  queue,
  history,
  sessionPlayCount,
  isPlaying,
  onRemoveTrack,
  onMoveTrack,
  onReorderTrack,
  onPlayNow,
}: QueueProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const totalQueueSeconds = queue.reduce((sum, t) => sum + (t.duration || 0), 0);

  const topRequester = (() => {
    const counts = new Map<string, number>();
    for (const t of [...(currentTrack ? [currentTrack] : []), ...queue, ...history]) {
      const req = t.requester?.trim();
      if (!req || req.startsWith("Autoplay")) continue;
      counts.set(req, (counts.get(req) ?? 0) + 1);
    }
    let bestName = "";
    let bestCount = 0;
    for (const [name, count] of counts.entries()) {
      if (count > bestCount) {
        bestName = name;
        bestCount = count;
      }
    }
    return bestName ? `${bestName} (${bestCount})` : "—";
  })();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Currently Playing Card */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Radio
            className={`w-4 h-4 ${isPlaying ? "text-red-500 animate-pulse" : "text-neutral-500"}`}
          />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Şu An Çalıyor
          </h2>
        </div>

        {currentTrack ? (
          <div className="relative overflow-hidden bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl group">
            <div
              className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, transparent 70%)",
              }}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-900 shrink-0 shadow-lg border border-white/5">
                {currentTrack.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Disc3 className="w-8 h-8" />
                  </div>
                )}

                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="flex items-end gap-1 h-5">
                      <span
                        className="w-1 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]"
                        style={{ height: "60%" }}
                      />
                      <span
                        className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite_0.2s]"
                        style={{ height: "100%" }}
                      />
                      <span
                        className="w-1 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite_0.4s]"
                        style={{ height: "45%" }}
                      />
                      <span
                        className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite_0.6s]"
                        style={{ height: "80%" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
                    Canlı
                  </span>
                  {currentTrack.requester && (
                    <span className="text-xs text-neutral-500">
                      Ekleyen:{" "}
                      <span className="text-neutral-300 font-medium">
                        {currentTrack.requester}
                      </span>
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {currentTrack.title}
                </h3>
                <p className="text-sm text-neutral-400 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              <div className="self-end sm:self-center text-right shrink-0">
                <span className="text-xs font-medium text-neutral-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  {formatDuration(currentTrack.duration)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-8 text-center text-neutral-500">
            <Disc3 className="w-10 h-10 mx-auto mb-2 opacity-30 animate-[spin_10s_linear_infinite]" />
            <p className="text-sm font-medium">Şu an çalan şarkı yok</p>
            <p className="text-xs text-neutral-600 mt-1">
              Arama kutusundan bir parça ekleyin
            </p>
          </div>
        )}
      </div>

      {/* Up Next / Queue Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-neutral-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Sıradaki Parçalar
            </h2>
            {queue.length > 1 && (
              <span className="hidden sm:inline text-[11px] text-neutral-600">
                (Sürükleyerek sıralayabilirsin)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 bg-white/5 text-neutral-300 rounded-full border border-white/5">
                <Clock className="w-3 h-3 text-red-400" />
                {formatTotalDuration(totalQueueSeconds)}
              </span>
            )}
            <span className="text-xs font-semibold px-2 py-0.5 bg-white/5 text-neutral-400 rounded-full border border-white/5">
              {queue.length} parça
            </span>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="bg-[#121212]/50 border border-white/5 rounded-2xl p-12 text-center text-neutral-500">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">Kuyruk boş</p>
            <p className="text-xs text-neutral-600 mt-1">
              Yukarıdaki arama çubuğunu kullanarak müzik ekleyebilirsiniz
            </p>
          </div>
        ) : (
          <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {queue.map((track, index) => {
              const isFirst = index === 0;
              const isLast = index === queue.length - 1;
              const isDragging = dragIndex === index;
              const isDragOver = dragOverIndex === index && dragIndex !== index;

              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) {
                      onReorderTrack(dragIndex, index);
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 transition-colors group ${
                    isDragging
                      ? "opacity-40 bg-white/5"
                      : isDragOver
                        ? "bg-red-500/10 border-t-2 border-red-500"
                        : "hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Drag Handle */}
                  <div
                    className="text-neutral-600 hover:text-neutral-300 cursor-grab active:cursor-grabbing shrink-0 hidden sm:flex"
                    title="Sürükle"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Position number */}
                  <span className="w-5 text-center text-xs font-mono font-medium text-neutral-500 shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail + Play Now */}
                  <button
                    onClick={() => onPlayNow(track.id)}
                    className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/5 cursor-pointer group/thumb"
                    title="Şimdi Çal"
                  >
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                  </button>

                  {/* Title & Artist + Requester */}
                  <button
                    onClick={() => onPlayNow(track.id)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                    title="Şimdi Çal"
                  >
                    <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {track.artist}
                      {track.requester ? ` • Ekleyen: ${track.requester}` : ""}
                    </p>
                  </button>

                  {/* Duration */}
                  <span className="text-xs text-neutral-500 shrink-0 font-mono">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayNow(track.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
                      title="Şimdi Çal"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => onMoveTrack(track.id, "up")}
                      disabled={isFirst}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors cursor-pointer"
                      title="Yukarı Taşı"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onMoveTrack(track.id, "down")}
                      disabled={isLast}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors cursor-pointer"
                      title="Aşağı Taşı"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveTrack(track.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Kuyruktan Çıkar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini Session Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-red-400" />
            <span>Oturumda Çalınan</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-white">
            {sessionPlayCount} şarkı
          </p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-red-400" />
            <span>Kuyruk Süresi</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-white">
            {formatTotalDuration(totalQueueSeconds)}
          </p>
        </div>

        <div className="bg-[#121212] border border-white/5 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
            <Music className="w-3.5 h-3.5 text-red-400" />
            <span>En Aktif DJ</span>
          </div>
          <p className="text-sm sm:text-base font-bold text-white truncate">
            {topRequester}
          </p>
        </div>
      </div>

      {/* Recently Played History Section */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center justify-between w-full px-1 py-1 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">
                Son Çalınanlar ({history.length})
              </h2>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-neutral-300">
              {showHistory ? "Gizle" : "Göster"}
            </span>
          </button>

          {showHistory && (
            <div className="mt-2 bg-[#121212] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              {history.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors group"
                >
                  <button
                    onClick={() => onPlayNow(track.id)}
                    className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 cursor-pointer group/thumb"
                    title="Tekrar Çal"
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
                    onClick={() => onPlayNow(track.id)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                    title="Tekrar Çal"
                  >
                    <p className="text-sm font-medium text-neutral-200 truncate group-hover:text-red-400 transition-colors">
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {track.artist}
                      {track.requester ? ` • ${track.requester}` : ""}
                    </p>
                  </button>

                  <span className="text-xs text-neutral-500 font-mono shrink-0">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
