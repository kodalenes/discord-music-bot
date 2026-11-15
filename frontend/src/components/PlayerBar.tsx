import { useState, type ChangeEvent } from "react";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Disc3,
  ChevronUp,
} from "lucide-react";
import type { PlayerState } from "../types";
import { formatDuration } from "../utils";

interface PlayerBarProps {
  playerState: PlayerState;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onSeek: (position: number) => void;
  onSetVolume: (volume: number) => void;
  onExpand: () => void;
}

export function PlayerBar({
  playerState,
  onPlay,
  onPause,
  onSkip,
  onSeek,
  onSetVolume,
  onExpand,
}: PlayerBarProps) {
  const { currentTrack, isPlaying, position, volume } = playerState;
  const [previousVolume, setPreviousVolume] = useState(volume || 80);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localSeekPos, setLocalSeekPos] = useState(0);

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
        onClick={onExpand}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        title="Tam Ekran Oynatıcıyı Aç"
      >
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xs sm:max-w-sm">
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
        </div>

        {/* Center: Playback Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1 shrink-0 cursor-default"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Play / Pause button */}
            {isPlaying ? (
              <button
                onClick={onPause}
                disabled={!currentTrack}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer"
                title="Duraklat"
              >
                <Pause className="w-5 h-5 fill-black" />
              </button>
            ) : (
              <button
                onClick={onPlay}
                disabled={!currentTrack}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer pl-0.5"
                title="Oynat"
              >
                <Play className="w-5 h-5 fill-black" />
              </button>
            )}

            {/* Skip button */}
            <button
              onClick={onSkip}
              disabled={!currentTrack}
              className="p-2 sm:p-2.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-all cursor-pointer"
              title="Sonraki Parçaya Geç"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Time Display */}
          <div className="text-[11px] font-mono text-neutral-500 hidden sm:flex items-center gap-1">
            <span>{formatDuration(currentPos)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: Volume & Time Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-end gap-2 sm:gap-3 flex-1 cursor-default"
        >
          {/* Mobile time display */}
          <span className="text-[11px] font-mono text-neutral-400 sm:hidden">
            {formatDuration(currentPos)}
          </span>

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
