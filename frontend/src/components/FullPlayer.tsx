import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Disc3,
  Music,
  ChevronUp,
  Trash2,
  ListMusic,
  FileText,
  Loader2,
  Radio,
  ArrowLeft,
  Plus,
} from "lucide-react";
import type {
  LyricsResult,
  PlayerState,
  PlaylistDetails,
  SavedPlaylist,
} from "../types";
import { formatDuration } from "../utils";

type RightTab = "queue" | "lyrics" | "playlists";

interface FullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  savedPlaylists: SavedPlaylist[];
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onSeek: (position: number) => void;
  onSetVolume: (volume: number) => void;
  onPlayNow: (trackId: string) => void;
  onPlayNowUri: (uri: string) => void;
  onAddTrack: (uri: string) => void;
  onAddAll: (uris: string[]) => void;
  onRemoveTrack: (trackId: string) => void;
  onMoveTrack: (trackId: string, direction: "up" | "down") => void;
  onGetPlaylistDetails: (
    idOrUrl: string,
    isAlbum?: boolean
  ) => Promise<PlaylistDetails | null>;
  onGetLyrics: (payload: {
    uri?: string;
    title: string;
    artist: string;
  }) => Promise<LyricsResult | null>;
}

const DEFAULT_COLOR: [number, number, number] = [110, 22, 32];

function extractDominantColor(
  url: string
): Promise<[number, number, number] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const brightness = (pr + pg + pb) / 3;
          if (brightness > 25 && brightness < 230) {
            r += pr;
            g += pg;
            b += pb;
            count += 1;
          }
        }

        if (count === 0) {
          resolve(null);
          return;
        }

        resolve([
          Math.round(r / count),
          Math.round(g / count),
          Math.round(b / count),
        ]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function FullPlayer({
  isOpen,
  onClose,
  playerState,
  savedPlaylists,
  onPlay,
  onPause,
  onSkip,
  onSeek,
  onSetVolume,
  onPlayNow,
  onPlayNowUri,
  onAddTrack,
  onAddAll,
  onRemoveTrack,
  onMoveTrack,
  onGetPlaylistDetails,
  onGetLyrics,
}: FullPlayerProps) {
  const { currentTrack, queue, isPlaying, position, volume } = playerState;
  const [rightTab, setRightTab] = useState<RightTab>("queue");
  const [accentRgb, setAccentRgb] =
    useState<[number, number, number]>(DEFAULT_COLOR);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localSeekPos, setLocalSeekPos] = useState(0);
  const [previousVolume, setPreviousVolume] = useState(volume || 80);

  const [lyricsData, setLyricsData] = useState<LyricsResult | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsTrackKeyRef = useRef<string>("");

  const [selectedPlaylist, setSelectedPlaylist] =
    useState<PlaylistDetails | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);

  // Extract dominant color from current track thumbnail
  useEffect(() => {
    let cancelled = false;
    if (!currentTrack?.thumbnail) {
      setAccentRgb(DEFAULT_COLOR);
      return;
    }

    void extractDominantColor(currentTrack.thumbnail).then((rgb) => {
      if (!cancelled) {
        setAccentRgb(rgb ?? DEFAULT_COLOR);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.thumbnail]);

  // Fetch lyrics when Lyrics tab is active or track changes
  useEffect(() => {
    if (!isOpen || rightTab !== "lyrics" || !currentTrack) return;
    const key = `${currentTrack.id}|${currentTrack.title}`;
    if (key === lyricsTrackKeyRef.current) return;

    let cancelled = false;
    lyricsTrackKeyRef.current = key;
    setLyricsData(null);
    setIsLoadingLyrics(true);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setIsLoadingLyrics(false);
      }
    }, 10000);

    void onGetLyrics({
      uri: currentTrack.uri,
      title: currentTrack.title,
      artist: currentTrack.artist,
    })
      .then((res) => {
        if (!cancelled) {
          setLyricsData(res);
          setIsLoadingLyrics(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLyricsData(null);
          setIsLoadingLyrics(false);
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, rightTab, currentTrack, onGetLyrics]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleSelectPlaylist = async (id: string) => {
    setSelectedPlaylist(null);
    setIsLoadingPlaylist(true);
    const details = await onGetPlaylistDetails(id, false);
    setSelectedPlaylist(details);
    setIsLoadingPlaylist(false);
  };

  const duration = currentTrack?.duration || 0;
  const currentPos = isSeeking ? localSeekPos : position;
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentPos / duration) * 100)) : 0;

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const handleSeekChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setLocalSeekPos(Number(e.target.value));
  };

  const handleSeekCommit = () => {
    setIsSeeking(false);
    onSeek(localSeekPos);
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      setPreviousVolume(volume);
      onSetVolume(0);
    } else {
      onSetVolume(previousVolume || 80);
    }
  };

  const [r, g, b] = accentRgb;

  const syncedLines = lyricsData?.syncedLines;
  const activeLyricIndex = (() => {
    if (!syncedLines || syncedLines.length === 0) return -1;
    let active = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].time <= currentPos + 0.35) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  })();

  useEffect(() => {
    if (!isOpen || rightTab !== "lyrics" || activeLyricIndex < 0) return;
    activeLyricRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeLyricIndex, isOpen, rightTab]);

  // Boosted bright accent color for active lyric highlight
  const hiR = Math.min(255, r + 90);
  const hiG = Math.min(255, g + 90);
  const hiB = Math.min(255, b + 90);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#070707] text-white transition-all duration-300 ease-out overflow-hidden ${
        isOpen
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      {/* Dynamic Cover-Art Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentTrack?.thumbnail && (
          <img
            src={currentTrack.thumbnail}
            alt=""
            className="w-full h-full object-cover blur-[90px] scale-125 opacity-35 transition-all duration-700"
          />
        )}
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            background: `radial-gradient(circle at 22% 45%, rgba(${r}, ${g}, ${b}, 0.55) 0%, rgba(10, 10, 12, 0.88) 58%, rgba(5, 5, 6, 0.98) 100%)`,
          }}
        />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
          title="Küçült (Esc)"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Küçült</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-300">
          <Radio
            className={`w-3.5 h-3.5 ${isPlaying ? "text-red-400 animate-pulse" : "text-neutral-500"}`}
          />
          <span>Şu An Çalıyor</span>
        </div>

        <div className="w-20" />
      </div>

      {/* Main Split Content */}
      <div className="relative z-10 flex-1 overflow-y-auto lg:overflow-hidden max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Large Cover Art & Controls */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start justify-center lg:pl-4 space-y-6">
          <div className="w-64 h-64 sm:w-80 sm:h-80 lg:w-[370px] lg:h-[370px] rounded-3xl overflow-hidden bg-neutral-900 shadow-[0_25px_70px_rgba(0,0,0,0.75)] border border-white/15 shrink-0">
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Disc3 className="w-20 h-20 opacity-40" />
              </div>
            )}
          </div>

          <div className="w-full max-w-[370px] space-y-4">
            <div className="text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                {currentTrack?.title || "Çalınan şarkı yok"}
              </h2>
              <p className="text-sm text-neutral-300 truncate mt-1">
                {currentTrack?.artist || "Bir şarkı seçin"}
              </p>
              {currentTrack?.requester && (
                <p className="text-xs text-neutral-400 mt-1">
                  Ekleyen: {currentTrack.requester}
                </p>
              )}
            </div>

            {/* Seek Bar */}
            <div className="space-y-1.5">
              <div className="relative h-2 w-full flex items-center group/seek">
                <div className="absolute inset-x-0 h-1.5 bg-white/15 rounded-full" />
                <div
                  className="absolute left-0 h-1.5 bg-white rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
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
                  className="relative z-10 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>{formatDuration(currentPos)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Playback & Volume Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                {isPlaying ? (
                  <button
                    onClick={onPause}
                    disabled={!currentTrack}
                    className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                    title="Duraklat"
                  >
                    <Pause className="w-6 h-6 fill-black" />
                  </button>
                ) : (
                  <button
                    onClick={onPlay}
                    disabled={!currentTrack}
                    className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer pl-0.5"
                    title="Oynat"
                  >
                    <Play className="w-6 h-6 fill-black" />
                  </button>
                )}

                <button
                  onClick={onSkip}
                  disabled={!currentTrack}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all cursor-pointer"
                  title="Sonraki Parçaya Geç"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title={volume === 0 ? "Sesi Aç" : "Sesi Kapat"}
                >
                  <VolumeIcon className="w-5 h-5" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => onSetVolume(Number(e.target.value))}
                  className="w-24 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-white"
                  title={`Ses: %${volume}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Queue / Lyrics / Playlists Panel */}
        <div className="lg:col-span-6 flex flex-col h-[460px] lg:h-[calc(100vh-140px)] bg-black/35 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-3 border-b border-white/10 bg-white/[0.03]">
            <button
              onClick={() => setRightTab("queue")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rightTab === "queue"
                  ? "bg-white text-black shadow"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Sıradaki ({queue.length})</span>
            </button>

            <button
              onClick={() => setRightTab("lyrics")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rightTab === "lyrics"
                  ? "bg-white text-black shadow"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Şarkı Sözleri</span>
            </button>

            <button
              onClick={() => setRightTab("playlists")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rightTab === "playlists"
                  ? "bg-white text-black shadow"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Listelerim ({savedPlaylists.length})</span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {rightTab === "queue" &&
              (queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-sm py-12">
                  <Music className="w-8 h-8 opacity-30 mb-2" />
                  <p>Sırada başka şarkı yok</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {queue.map((track, idx) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <span className="w-5 text-center text-xs font-mono text-neutral-500 shrink-0">
                        {idx + 1}
                      </span>

                      <button
                        onClick={() => onPlayNow(track.id)}
                        className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 cursor-pointer group/thumb"
                        title="Şimdi Çal"
                      >
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
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

                      <button
                        onClick={() => onPlayNow(track.id)}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                        title="Şimdi Çal"
                      >
                        <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {track.artist} • {formatDuration(track.duration)}
                        </p>
                      </button>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onMoveTrack(track.id, "up")}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                          title="Yukarı Taşı"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onMoveTrack(track.id, "down")}
                          disabled={idx === queue.length - 1}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                          title="Aşağı Taşı"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveTrack(track.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                          title="Kuyruktan Çıkar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {rightTab === "lyrics" &&
              (!currentTrack ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-sm py-12">
                  <FileText className="w-8 h-8 opacity-30 mb-2" />
                  <p>Şu an çalan şarkı yok</p>
                </div>
              ) : isLoadingLyrics ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-300 text-sm gap-2 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                  <span>Şarkı sözleri aranıyor...</span>
                </div>
              ) : lyricsData ? (
                <div className="space-y-4 px-2 py-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-white/10 pb-2 sticky top-0 bg-black/50 backdrop-blur-md z-10 px-1 rounded-lg">
                    <span className="font-semibold text-neutral-300 truncate">
                      {currentTrack.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {lyricsData.syncedLines &&
                        lyricsData.syncedLines.length > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `rgba(${r}, ${g}, ${b}, 0.38)`,
                              color: `rgb(${hiR}, ${hiG}, ${hiB})`,
                              border: `1px solid rgba(${hiR}, ${hiG}, ${hiB}, 0.45)`,
                            }}
                          >
                            Senkron
                          </span>
                        )}
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                        {lyricsData.source}
                      </span>
                    </div>
                  </div>

                  {lyricsData.syncedLines &&
                  lyricsData.syncedLines.length > 0 ? (
                    <div className="space-y-2 py-8">
                      {lyricsData.syncedLines.map((line, idx) => {
                        const isActive = idx === activeLyricIndex;
                        const isPast =
                          activeLyricIndex >= 0 && idx < activeLyricIndex;
                        return (
                          <button
                            key={`${line.time}-${idx}`}
                            ref={isActive ? activeLyricRef : null}
                            onClick={() => onSeek(Math.floor(line.time))}
                            style={
                              isActive
                                ? {
                                    background: `linear-gradient(90deg, rgba(${r}, ${g}, ${b}, 0.45) 0%, rgba(${r}, ${g}, ${b}, 0.12) 100%)`,
                                    borderLeft: `3px solid rgb(${hiR}, ${hiG}, ${hiB})`,
                                    textShadow: `0 0 18px rgba(${hiR}, ${hiG}, ${hiB}, 0.55)`,
                                  }
                                : undefined
                            }
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-300 ease-out cursor-pointer block ${
                              isActive
                                ? "text-white font-bold text-base sm:text-lg scale-[1.02] shadow-lg"
                                : isPast
                                  ? "text-neutral-500/75 text-sm sm:text-base hover:text-neutral-300"
                                  : "text-neutral-300/65 text-sm sm:text-base hover:text-white"
                            }`}
                            title="Bu satıra atla"
                          >
                            {line.text}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-neutral-100">
                      {lyricsData.lyrics}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-sm py-12 text-center">
                  <FileText className="w-8 h-8 opacity-30 mb-2" />
                  <p>Bu şarkı için söz bulunamadı.</p>
                </div>
              ))}

            {rightTab === "playlists" &&
              (isLoadingPlaylist ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-300 text-sm gap-2 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                  <span>Çalma listesi yükleniyor...</span>
                </div>
              ) : selectedPlaylist ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                    <button
                      onClick={() => setSelectedPlaylist(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Listelerim</span>
                    </button>
                    <p className="text-xs font-semibold text-white truncate flex-1 text-center">
                      {selectedPlaylist.title} ({selectedPlaylist.tracks.length})
                    </p>
                    {selectedPlaylist.tracks.length > 0 && (
                      <button
                        onClick={() =>
                          onAddAll(
                            selectedPlaylist.tracks.map((track) => track.uri)
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer shrink-0"
                        title="Tümünü Sıraya Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tümünü Ekle</span>
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-white/5">
                    {selectedPlaylist.tracks.map((track, idx) => (
                      <div
                        key={`${track.id}-${idx}`}
                        className="flex items-center gap-3 py-2 px-1.5 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <span className="w-5 text-center text-xs font-mono text-neutral-500 shrink-0">
                          {idx + 1}
                        </span>

                        <button
                          onClick={() => onPlayNowUri(track.uri)}
                          className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 cursor-pointer group/thumb"
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

                        <button
                          onClick={() => onPlayNowUri(track.uri)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                          title="Şimdi Çal"
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

                        <button
                          onClick={() => onAddTrack(track.uri)}
                          className="p-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all cursor-pointer shrink-0"
                          title="Kuyruğa Ekle"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : savedPlaylists.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-sm py-12 text-center">
                  <ListMusic className="w-8 h-8 opacity-30 mb-2" />
                  <p>Henüz kayıtlı çalma listesi yok.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedPlaylists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => void handleSelectPlaylist(pl.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/10 border border-white/5 transition-colors text-left cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                        {pl.thumbnail ? (
                          <img
                            src={pl.thumbnail}
                            alt={pl.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            <ListMusic className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                          {pl.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {[pl.author, `${pl.trackCount} şarkı`]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
