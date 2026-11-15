import { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  LogOut,
  ListMusic,
  Radio,
  Compass,
  Users,
  BarChart3,
} from "lucide-react";
import { PinModal } from "./components/PinModal";
import { SearchBar } from "./components/SearchBar";
import { Queue } from "./components/Queue";
import { PlayerBar } from "./components/PlayerBar";
import { FullPlayer } from "./components/FullPlayer";
import { ArtistView } from "./components/ArtistView";
import { PlaylistView } from "./components/PlaylistView";
import { SavedPlaylists } from "./components/SavedPlaylists";
import { ExploreView } from "./components/ExploreView";
import { StatsView } from "./components/StatsView";
import { useSocket } from "./hooks/useSocket";
import type { ArtistProfile, ExploreFeed, PlaylistDetails } from "./types";

const PIN_STORAGE_KEY = "muzik_pin";
const NICKNAME_STORAGE_KEY = "muzik_nickname";

type ActiveView =
  | { kind: "queue" }
  | { kind: "explore" }
  | { kind: "playlists" }
  | { kind: "stats" }
  | { kind: "artist"; artistId: string }
  | { kind: "playlist"; idOrUrl: string; isAlbum?: boolean };

export default function App() {
  const [pin, setPin] = useState<string | null>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY);
  });
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) || "Misafir";
  });

  const [view, setView] = useState<ActiveView>({ kind: "queue" });
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(
    null
  );
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [playlistDetails, setPlaylistDetails] =
    useState<PlaylistDetails | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [exploreFeed, setExploreFeed] = useState<ExploreFeed | null>(null);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showUsersMenu, setShowUsersMenu] = useState(false);

  const {
    playerState,
    savedPlaylists,
    stats,
    connectedUsers,
    notices,
    isConnected,
    lastError,
    clearError,
    browseSearch,
    getArtistProfile,
    getPlaylistDetails,
    getExploreFeed,
    addTrack,
    addTracks,
    playNow,
    removeTrack,
    moveTrack,
    reorderTrack,
    play,
    pause,
    skip,
    previous,
    shuffle,
    cycleLoop,
    toggleAutoplay,
    setAudioFilter,
    seek,
    setVolume,
    savePlaylist,
    deletePlaylist,
    getLyrics,
    updateNickname,
  } = useSocket(pin, nickname);

  useEffect(() => {
    if (pin) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
    }
  }, [pin]);

  useEffect(() => {
    if (nickname) {
      localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
    }
  }, [nickname]);

  const handleLogin = (enteredPin: string, enteredNickname: string) => {
    setNickname(enteredNickname);
    setPin(enteredPin);
    clearError();
  };

  const handleLogout = () => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    setPin(null);
    clearError();
  };

  const navigateTo = useCallback(
    (nextView: ActiveView, fullPlayer = false) => {
      setView(nextView);
      setIsFullPlayerOpen(fullPlayer);
      window.history.pushState(
        { view: nextView, fullPlayer },
        "",
        fullPlayer
          ? "#player"
          : nextView.kind === "queue"
            ? "#queue"
            : nextView.kind === "explore"
              ? "#explore"
              : nextView.kind === "playlists"
                ? "#playlists"
                : nextView.kind === "stats"
                  ? "#stats"
                  : nextView.kind === "artist"
                    ? `#artist/${nextView.artistId}`
                    : `#playlist/${nextView.idOrUrl}`
      );
    },
    []
  );

  const loadExplore = useCallback(
    async (force = false) => {
      if (!force && exploreFeed) return;
      setIsLoadingExplore(true);
      const feed = await getExploreFeed();
      setExploreFeed(feed);
      setIsLoadingExplore(false);
    },
    [exploreFeed, getExploreFeed]
  );

  const handleOpenExplore = useCallback(
    (pushHistory = true) => {
      if (pushHistory) {
        navigateTo({ kind: "explore" }, false);
      } else {
        setView({ kind: "explore" });
      }
      void loadExplore(false);
    },
    [loadExplore, navigateTo]
  );

  const handleOpenArtist = useCallback(
    async (artistId: string, pushHistory = true) => {
      const nextView: ActiveView = { kind: "artist", artistId };
      if (pushHistory) {
        navigateTo(nextView, false);
      } else {
        setView(nextView);
      }
      setArtistProfile(null);
      setIsLoadingArtist(true);
      const profile = await getArtistProfile(artistId);
      setArtistProfile(profile);
      setIsLoadingArtist(false);
    },
    [getArtistProfile, navigateTo]
  );

  const handleOpenPlaylist = useCallback(
    async (idOrUrl: string, isAlbum?: boolean, pushHistory = true) => {
      const nextView: ActiveView = { kind: "playlist", idOrUrl, isAlbum };
      if (pushHistory) {
        navigateTo(nextView, false);
      } else {
        setView(nextView);
      }
      setPlaylistDetails(null);
      setIsLoadingPlaylist(true);
      const details = await getPlaylistDetails(idOrUrl, isAlbum);
      setPlaylistDetails(details);
      setIsLoadingPlaylist(false);
    },
    [getPlaylistDetails, navigateTo]
  );

  // Browser Back / Forward navigation support (mouse back/forward buttons)
  useEffect(() => {
    if (!window.history.state?.view) {
      window.history.replaceState(
        { view: { kind: "queue" }, fullPlayer: false },
        "",
        "#queue"
      );
    }

    const onPopState = (event: PopStateEvent) => {
      const state = event.state as
        | { view?: ActiveView; fullPlayer?: boolean }
        | null;
      if (!state?.view) {
        setView({ kind: "queue" });
        setIsFullPlayerOpen(false);
        return;
      }

      setIsFullPlayerOpen(Boolean(state.fullPlayer));
      const target = state.view;
      if (target.kind === "artist") {
        void handleOpenArtist(target.artistId, false);
      } else if (target.kind === "playlist") {
        void handleOpenPlaylist(target.idOrUrl, target.isAlbum, false);
      } else if (target.kind === "explore") {
        handleOpenExplore(false);
      } else {
        setView(target);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [handleOpenArtist, handleOpenPlaylist, handleOpenExplore]);

  // Global keyboard shortcuts (Space, Shift+N / Shift+ArrowRight, Shift+P / Shift+ArrowLeft)
  useEffect(() => {
    if (!pin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (playerState.isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (
        e.shiftKey &&
        (e.key === "N" || e.key === "n" || e.key === "ArrowRight")
      ) {
        e.preventDefault();
        skip();
      } else if (
        e.shiftKey &&
        (e.key === "P" || e.key === "p" || e.key === "ArrowLeft")
      ) {
        e.preventDefault();
        previous();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pin, playerState.isPlaying, play, pause, skip, previous]);

  // Windows / OS Media Session API integration (Media Keys + Lock Screen / Taskbar overlay)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const track = playerState.currentTrack;
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "TARmusic",
        artwork: track.thumbnail
          ? [{ src: track.thumbnail, sizes: "512x512", type: "image/jpeg" }]
          : [{ src: "/Ikarus_Logo.webp", sizes: "512x512", type: "image/webp" }],
      });
      navigator.mediaSession.playbackState = playerState.isPlaying
        ? "playing"
        : "paused";
    } else {
      navigator.mediaSession.playbackState = "none";
    }

    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("nexttrack", skip);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        seek(Math.floor(details.seekTime));
      }
    });
  }, [
    playerState.currentTrack,
    playerState.isPlaying,
    play,
    pause,
    skip,
    previous,
    seek,
  ]);

  if (!pin) {
    return (
      <PinModal
        initialNickname={nickname === "Misafir" ? "" : nickname}
        onSuccess={handleLogin}
        error={lastError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col selection:bg-red-500/30 selection:text-white">
      {/* Live Activity Toast Notifications */}
      {notices.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs">
          {notices.map((n) => (
            <div
              key={n.id}
              className="px-3.5 py-2 rounded-xl bg-[#181818]/95 border border-white/10 shadow-xl text-xs text-neutral-200 backdrop-blur-md animate-fade-in"
            >
              {n.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#030303]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo */}
          <button
            onClick={() => navigateTo({ kind: "queue" }, false)}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer text-left"
          >
            <img
              src="/Ikarus_Logo.webp"
              alt="ikarusgg"
              className="w-9 h-9 rounded-xl object-cover shadow-lg border border-white/10"
            />
            <div>
              <span className="font-bold tracking-tight text-lg sm:text-xl text-white">
                TARmusic
              </span>
              <span className="text-[10px] text-neutral-500 block -mt-1 font-mono">
                ikarusgg.me
              </span>
            </div>
          </button>

          {/* Search bar in center */}
          <div className="flex-1 max-w-xl mx-1 sm:mx-6">
            <SearchBar
              onBrowseSearch={browseSearch}
              onAddTrack={addTrack}
              onPlayNow={(uri) => void playNow({ uri })}
              onOpenArtist={(artistId) => void handleOpenArtist(artistId)}
              onOpenPlaylist={(idOrUrl, isAlbum) =>
                void handleOpenPlaylist(idOrUrl, isAlbum)
              }
            />
          </div>

          {/* Right: Online Users + Status + Logout */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              onClick={() => setShowUsersMenu((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors cursor-pointer"
              title="Bağlı Kullanıcılar"
            >
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>{connectedUsers.length}</span>
            </button>

            {showUsersMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-3.5 z-50 space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                    Takma Adın
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      updateNickname(e.target.value);
                    }}
                    className="w-full bg-[#202020] text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-1.5">
                    Çevrimiçi ({connectedUsers.length})
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {connectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 text-xs text-neutral-200 px-2 py-1 rounded-lg bg-white/[0.03]"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{u.nickname}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
              title={
                isConnected
                  ? "WebSocket Bağlantısı Aktif"
                  : "Bağlantı Kuruluyor..."
              }
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Bağlı</span>
                  <Wifi className="w-3.5 h-3.5 sm:hidden" />
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="hidden sm:inline">Bağlanıyor</span>
                  <WifiOff className="w-3.5 h-3.5 sm:hidden" />
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-colors cursor-pointer"
              title="PIN Değiştir / Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Optional Error Alert Banner */}
      {lastError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-xs text-red-400 flex items-center justify-center gap-2">
          <span>{lastError}</span>
          <button
            onClick={clearError}
            className="underline hover:text-red-300 ml-2 cursor-pointer font-medium"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-44 sm:pb-36 space-y-5">
        {/* View Switcher Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigateTo({ kind: "queue" }, false)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              view.kind === "queue"
                ? "bg-white text-black shadow"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Kuyruk ({playerState.queue.length})
          </button>

          <button
            onClick={() => handleOpenExplore(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              view.kind === "explore"
                ? "bg-white text-black shadow"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Keşfet
          </button>

          <button
            onClick={() => navigateTo({ kind: "playlists" }, false)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              view.kind === "playlists"
                ? "bg-white text-black shadow"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            Listelerim ({savedPlaylists.length})
          </button>

          <button
            onClick={() => navigateTo({ kind: "stats" }, false)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              view.kind === "stats"
                ? "bg-white text-black shadow"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            İstatistikler
          </button>
        </div>

        {view.kind === "queue" && (
          <Queue
            currentTrack={playerState.currentTrack}
            queue={playerState.queue}
            history={playerState.history}
            sessionPlayCount={playerState.sessionPlayCount}
            isPlaying={playerState.isPlaying}
            onRemoveTrack={removeTrack}
            onMoveTrack={moveTrack}
            onReorderTrack={reorderTrack}
            onPlayNow={(trackId) => void playNow({ trackId })}
          />
        )}

        {view.kind === "explore" && (
          <ExploreView
            feed={exploreFeed}
            isLoading={isLoadingExplore}
            onRefresh={() => void loadExplore(true)}
            onPlayNow={(uri) => void playNow({ uri })}
            onAddTrack={(uri) => addTrack({ uri })}
            onOpenPlaylist={(id, isAlbum) =>
              void handleOpenPlaylist(id, isAlbum)
            }
          />
        )}

        {view.kind === "playlists" && (
          <SavedPlaylists
            playlists={savedPlaylists}
            onSavePlaylist={savePlaylist}
            onDeletePlaylist={deletePlaylist}
            onOpenPlaylist={(id) => void handleOpenPlaylist(id, false)}
          />
        )}

        {view.kind === "stats" && (
          <StatsView
            stats={stats}
            sessionPlayCount={playerState.sessionPlayCount}
            onPlayNow={(uri) => void playNow({ uri })}
            onAddTrack={(uri) => addTrack({ uri })}
          />
        )}

        {view.kind === "artist" && (
          <ArtistView
            profile={artistProfile}
            isLoading={isLoadingArtist}
            onBack={() => window.history.back()}
            onAddTrack={(uri) => addTrack({ uri })}
            onAddAll={(uris) => void addTracks(uris)}
            onPlayNow={(uri) => void playNow({ uri })}
            onOpenPlaylist={(id, isAlbum) =>
              void handleOpenPlaylist(id, isAlbum)
            }
          />
        )}

        {view.kind === "playlist" && (
          <PlaylistView
            details={playlistDetails}
            isLoading={isLoadingPlaylist}
            onBack={() => window.history.back()}
            onAddTrack={(uri) => addTrack({ uri })}
            onAddAll={(uris) => void addTracks(uris)}
            onPlayNow={(uri) => void playNow({ uri })}
            onSavePlaylist={(id) => void savePlaylist(id)}
          />
        )}
      </main>

      {/* Bottom Sticky Player */}
      <PlayerBar
        playerState={playerState}
        onPlay={play}
        onPause={pause}
        onSkip={skip}
        onPrevious={previous}
        onShuffle={shuffle}
        onCycleLoop={() => cycleLoop()}
        onToggleAutoplay={() => toggleAutoplay()}
        onSetAudioFilter={setAudioFilter}
        onSeek={seek}
        onSetVolume={setVolume}
        onExpand={() => navigateTo(view, true)}
      />

      {/* Fullscreen Now Playing Drawer */}
      <FullPlayer
        isOpen={isFullPlayerOpen}
        onClose={() => {
          if (window.history.state?.fullPlayer) {
            window.history.back();
          } else {
            setIsFullPlayerOpen(false);
          }
        }}
        playerState={playerState}
        savedPlaylists={savedPlaylists}
        onPlay={play}
        onPause={pause}
        onSkip={skip}
        onPrevious={previous}
        onShuffle={shuffle}
        onCycleLoop={() => cycleLoop()}
        onToggleAutoplay={() => toggleAutoplay()}
        onSetAudioFilter={setAudioFilter}
        onSeek={seek}
        onSetVolume={setVolume}
        onPlayNow={(trackId) => void playNow({ trackId })}
        onPlayNowUri={(uri) => void playNow({ uri })}
        onAddTrack={(uri) => addTrack({ uri })}
        onAddAll={(uris) => void addTracks(uris)}
        onRemoveTrack={removeTrack}
        onMoveTrack={moveTrack}
        onGetPlaylistDetails={getPlaylistDetails}
        onGetLyrics={getLyrics}
      />
    </div>
  );
}
