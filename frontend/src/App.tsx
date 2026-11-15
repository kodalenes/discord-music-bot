import { useState, useEffect } from "react";
import { Music2, Wifi, WifiOff, LogOut } from "lucide-react";
import { PinModal } from "./components/PinModal";
import { SearchBar } from "./components/SearchBar";
import { Queue } from "./components/Queue";
import { PlayerBar } from "./components/PlayerBar";
import { useSocket } from "./hooks/useSocket";

const PIN_STORAGE_KEY = "muzik_pin";

export default function App() {
  const [pin, setPin] = useState<string | null>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY);
  });

  const {
    playerState,
    isConnected,
    lastError,
    clearError,
    search,
    addTrack,
    removeTrack,
    moveTrack,
    play,
    pause,
    skip,
    seek,
    setVolume,
  } = useSocket(pin);

  // If pin changes or is set, keep localStorage in sync
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

  if (!pin) {
    return <PinModal onSuccess={handleLogin} error={lastError} />;
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col selection:bg-red-500/30 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#030303]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
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
          </div>

          {/* Search bar in center */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-6">
            <SearchBar onSearch={search} onAddTrack={addTrack} />
          </div>

          {/* Right status & Logout */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
              title={isConnected ? "WebSocket Bağlantısı Aktif" : "Bağlantı Kuruluyor..."}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32">
        <Queue
          currentTrack={playerState.currentTrack}
          queue={playerState.queue}
          isPlaying={playerState.isPlaying}
          onRemoveTrack={removeTrack}
          onMoveTrack={moveTrack}
        />
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
