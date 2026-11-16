import { useState, type ChangeEvent } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Disc3,
  ChevronUp,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  Heart,
} from "lucide-react";
import type { AudioFilterPreset, PlayerState } from "../types";
import { formatDuration } from "../utils";
import { AUDIO_PRESET_LIST } from "./AudioStudioModal";
import { useTrackMenu } from "./TrackContextMenu";

interface PlayerBarProps {
  playerState: PlayerState;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onCycleLoop: () => void;
  onToggleAutoplay: () => void;
  onSetAudioFilter: (preset: AudioFilterPreset) => void;
  onOpenAudioStudio: () => void;
  onSeek: (position: number) => void;
  onSetVolume: (volume: number) => void;
  onExpand: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
}

export function PlayerBar({
  playerState,
  onPlay,
  onPause,
  onSkip,
  onPrevious,
  onShuffle,
  onCycleLoop,
  onToggleAutoplay,
  onSetAudioFilter,
  onOpenAudioStudio,
  onSeek,
  onSetVolume,
  onExpand,
  isLiked,
  onToggleLike,
}: PlayerBarProps) {
  const { openTrackMenu } = useTrackMenu();
  const {
    currentTrack,
    isPlaying,
    position,
    volume,
    loopMode,
    autoplay,
    audioFilter,
    history,
    queue,
  } = playerState;
  const [previousVolume, setPreviousVolume] = useState(volume || 80);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localSeekPos, setLocalSeekPos] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const duration = currentTrack?.duration || 0;
  const currentPos = isSeeking ? localSeekPos : position;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentPos / duration) * 100)) : 0;

  const handleSeekChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setLocalSeekPos(Number(e.target.value));
  };

  const handleSeekCommit = () => {
    setIsSeeking(false);
    onSeek(localSeekPos);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    onSetVolume(newVol);
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      onSetVolume(0);
    } else {
      onSetVolume(previousVolume || 80);
    }
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-2xl border-t border-white/10 select-none">
      {/* Seekable Progress Bar along top edge */}
      <div className="relative group/progress h-2 w-full cursor-pointer flex items-center -top-1">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1 bg-white/10 group-hover/progress:h-1.5 transition-all" />
        {/* Fill progress */}
        <div
          className="absolute left-0 h-1 bg-red-600 group-hover/progress:h-1.5 transition-all shadow-[0_0_8px_rgba(239,68,68,0.5)]"
          style={{ width: `${progressPercent}%` }}
        />
        {/* HTML Input Range overlay */}
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={currentPos}
          disabled={!currentTrack}
          onChange={handleSeekChange}
          onMouseUp={handleSeekCommit}
          onTouchEnd={handleSeekCommit}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          title="Parçada gezin"
        />
        {/* Thumb indicator on hover */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -ml-2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform pointer-events-none"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input")) return;
          onExpand();
        }}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        title="Tam Ekran Oynatıcıyı Aç"
      >
        {/* Left: Track Information */}
        <div
          onContextMenu={(e) => {
            if (currentTrack) openTrackMenu(e, currentTrack);
          }}
          className="flex items-center gap-3 min-w-0"
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/5 group/art">
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Disc3 className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {currentTrack?.title || "Çalınan şarkı yok"}
            </p>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {currentTrack?.artist || "Bir şarkı seçin"}
            </p>
          </div>

          {currentTrack && (
            <button
              onClick={onToggleLike}
              className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                isLiked
                  ? "text-rose-500 hover:bg-rose-500/10"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
              title={isLiked ? "Beğenilerden Kaldır" : "Beğenilenlere Ekle"}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        {/* Center: Playback Controls */}
        <div className="flex flex-col items-center gap-1 justify-self-center">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Shuffle */}
            <button
              onClick={onShuffle}
              disabled={queue.length < 2}
              className="hidden sm:inline-flex p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
              title="Kuyruğu Karıştır"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={onPrevious}
              disabled={history.length === 0}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all cursor-pointer"
              title="Önceki Parça (Shift+P)"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Play / Pause button */}
            {isPlaying ? (
              <button
                onClick={onPause}
                disabled={!currentTrack}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer"
                title="Duraklat (Space)"
              >
                <Pause className="w-5 h-5 fill-black" />
              </button>
            ) : (
              <button
                onClick={onPlay}
                disabled={!currentTrack}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer pl-0.5"
                title="Oynat (Space)"
              >
                <Play className="w-5 h-5 fill-black" />
              </button>
            )}

            {/* Skip button */}
            <button
              onClick={onSkip}
              disabled={!currentTrack}
              className="p-2 sm:p-2.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-all cursor-pointer"
              title="Sonraki Parça (Shift+N)"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Loop */}
            <button
              onClick={onCycleLoop}
              className={`hidden sm:inline-flex p-2 rounded-full transition-all cursor-pointer ${
                loopMode !== "off"
                  ? "text-red-400 bg-red-500/15 hover:bg-red-500/25"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title={
                loopMode === "track"
                  ? "Döngü: Tek Şarkı"
                  : loopMode === "queue"
                    ? "Döngü: Tüm Kuyruk"
                    : "Döngü: Kapalı"
              }
            >
              {loopMode === "track" ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Time Display */}
          <div className="text-[11px] font-mono text-neutral-500 hidden sm:flex items-center gap-1">
            <span>{formatDuration(currentPos)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: Autoplay, Filter, Volume & Expand */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0 relative">
          {/* Mobile time display */}
          <span className="text-[11px] font-mono text-neutral-400 sm:hidden">
            {formatDuration(currentPos)}
          </span>

          {/* Autoplay Toggle */}
          <button
            onClick={onToggleAutoplay}
            className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors cursor-pointer ${
              autoplay
                ? "text-red-400 bg-red-500/15 hover:bg-red-500/25"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
            title={
              autoplay
                ? "Otomatik Devam (Radyo): Açık"
                : "Otomatik Devam (Radyo): Kapalı"
            }
          >
            <InfinityIcon className="w-4 h-4" />
          </button>

          {/* Audio Filter Popover */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                audioFilter !== "off"
                  ? "text-red-400 bg-red-500/15 hover:bg-red-500/25"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title={`Ses Efekti: ${audioFilter}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {showFilters && (
              <div className="absolute bottom-full right-0 mb-3 w-48 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1 max-h-80 overflow-y-auto">
                <button
                  onClick={() => {
                    setShowFilters(false);
                    onOpenAudioStudio();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 transition-colors cursor-pointer mb-1"
                >
                  <span>Ses Stüdyosu (EQ)</span>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1">
                  Hazır Modlar
                </p>
                {AUDIO_PRESET_LIST.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onSetAudioFilter(opt.id);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      audioFilter === opt.id
                        ? "bg-red-600 text-white"
                        : "text-neutral-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 group/volume">
            <button
              onClick={handleToggleMute}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={volume === 0 ? "Sesi Aç" : "Sesi Kapat"}
            >
              <VolumeIcon className="w-5 h-5" />
            </button>

            <div className="w-16 sm:w-24 relative flex items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-red-500 focus:outline-none"
                title={`Ses: %${volume}`}
              />
            </div>
          </div>

          <button
            onClick={onExpand}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tam Ekran Aç"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
