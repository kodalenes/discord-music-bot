import { useState, useEffect, useCallback } from "react";
import { Music2, Wifi, WifiOff, LogOut, ListMusic, Radio } from "lucide-react";
import { PinModal } from "./components/PinModal";
import { SearchBar } from "./components/SearchBar";
import { Queue } from "./components/Queue";
import { PlayerBar } from "./components/PlayerBar";
import { ArtistView } from "./components/ArtistView";
import { PlaylistView } from "./components/PlaylistView";
import { SavedPlaylists } from "./components/SavedPlaylists";
import { useSocket } from "./hooks/useSocket";
import type { ArtistProfile, PlaylistDetails } from "./types";

const PIN_STORAGE_KEY = "muzik_pin";

type ActiveView =
  | { kind: "queue" }
  | { kind: "playlists" }
  | { kind: "artist"; artistId: string }
  | { kind: "playlist"; idOrUrl: string; isAlbum?: boolean };

export default function App() {
  const [pin, setPin] = useState<string | null>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY);
  });

  const [view, setView] = useState<ActiveView>({ kind: "queue" });
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(
    null
  );
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [playlistDetails, setPlaylistDetails] =
    useState<PlaylistDetails | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  const {
    playerState,
    savedPlaylists,
    isConnected,
    lastError,
    clearError,
    browseSearch,
    getArtistProfile,
    getPlaylistDetails,
    addTrack,
    addTracks,
    playNow,
    removeTrack,
    moveTrack,
    play,
    pause,
    skip,
    seek,
    setVolume,
    savePlaylist,
    deletePlaylist,
  } = useSocket(pin);

  useEffect(() => {
    if (pin) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
    }
  }, [pin]);

  const handleLogin = (enteredPin: string) => {
    setPin(enteredPin);
    clearError();
  };

  const handleLogout = () => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    setPin(null);
    clearError();
  };

  const handleOpenArtist = useCallback(
    async (artistId: string) => {
      setView({ kind: "artist", artistId });
      setArtistProfile(null);
      setIsLoadingArtist(true);
      const profile = await getArtistProfile(artistId);
      setArtistProfile(profile);
      setIsLoadingArtist(false);
    },
    [getArtistProfile]
  );

  const handleOpenPlaylist = useCallback(
    async (idOrUrl: string, isAlbum?: boolean) => {
      setView({ kind: "playlist", idOrUrl, isAlbum });
      setPlaylistDetails(null);
      setIsLoadingPlaylist(true);
      const details = await getPlaylistDetails(idOrUrl, isAlbum);
      setPlaylistDetails(details);
      setIsLoadingPlaylist(false);
    },
    [getPlaylistDetails]
  );

  if (!pin) {
    return <PinModal onSuccess={handleLogin} error={lastError} />;
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col selection:bg-red-500/30 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#030303]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => setView({ kind: "queue" })}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg sm:text-xl text-white">
                muzik
              </span>
              <span className="text-[10px] text-neutral-500 block -mt-1 font-mono">
                ikarusgg.me
              </span>
            </div>
          </button>

          {/* Search bar in center */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-6">
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

          {/* Right status & Logout */}
          <div className="flex items-center gap-3 shrink-0">
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-32 space-y-5">
        {/* View Switcher Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView({ kind: "queue" })}
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
            onClick={() => setView({ kind: "playlists" })}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              view.kind === "playlists"
                ? "bg-white text-black shadow"
                : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            Listelerim ({savedPlaylists.length})
          </button>
        </div>

        {view.kind === "queue" && (
          <Queue
            currentTrack={playerState.currentTrack}
            queue={playerState.queue}
            isPlaying={playerState.isPlaying}
            onRemoveTrack={removeTrack}
            onMoveTrack={moveTrack}
            onPlayNow={(trackId) => void playNow({ trackId })}
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

        {view.kind === "artist" && (
          <ArtistView
            profile={artistProfile}
            isLoading={isLoadingArtist}
            onBack={() => setView({ kind: "queue" })}
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
            onBack={() => setView({ kind: "queue" })}
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
        onSeek={seek}
        onSetVolume={setVolume}
      />
    </div>
  );
}
