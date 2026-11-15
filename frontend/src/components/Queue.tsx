import { Trash2, ChevronUp, ChevronDown, Disc3, Music, Radio } from "lucide-react";
import type { Track } from "../types";
import { formatDuration } from "../utils";

interface QueueProps {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  onRemoveTrack: (trackId: string) => void;
  onMoveTrack: (trackId: string, direction: "up" | "down") => void;
}

export function Queue({
  currentTrack,
  queue,
  isPlaying,
  onRemoveTrack,
  onMoveTrack,
}: QueueProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Currently Playing Card */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Radio className={`w-4 h-4 ${isPlaying ? "text-red-500 animate-pulse" : "text-neutral-500"}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Şu An Çalıyor
          </h2>
        </div>

        {currentTrack ? (
          <div className="relative overflow-hidden bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl group">
            {/* Ambient background glow */}
            <div
              className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, transparent 70%)",
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

                {/* Animated Equalizer Overlay when playing */}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="flex items-end gap-1 h-5">
                      <span className="w-1 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ height: "60%" }} />
                      <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite_0.2s]" style={{ height: "100%" }} />
                      <span className="w-1 bg-red-500 rounded-full animate-[bounce_1s_ease-in-out_infinite_0.4s]" style={{ height: "45%" }} />
                      <span className="w-1 bg-white rounded-full animate-[bounce_1s_ease-in-out_infinite_0.6s]" style={{ height: "80%" }} />
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
                      Ekleyen: <span className="text-neutral-400">{currentTrack.requester}</span>
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
            <p className="text-xs text-neutral-600 mt-1">Arama kutusundan bir parça ekleyin</p>
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
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 bg-white/5 text-neutral-400 rounded-full border border-white/5">
            {queue.length} parça
          </span>
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

              return (
                <div
                  key={track.id}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Position number */}
                  <span className="w-6 text-center text-xs font-mono font-medium text-neutral-500 shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/5">
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
                  </div>

                  {/* Title & Artist */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate group-hover:text-neutral-100">
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-neutral-500 shrink-0 font-mono">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}
