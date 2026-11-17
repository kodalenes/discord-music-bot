import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Crown,
  Disc3,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { CaseRarity, CaseTrackItem } from "../types";
import { formatDuration } from "../utils";
import {
  playCaseRevealSound,
  playCaseTickSound,
  playCaseUnlockSound,
} from "../cs2Audio";

const CARD_WIDTH = 152;
const CARD_GAP = 8;
const STEP = CARD_WIDTH + CARD_GAP; // 160px
const TOTAL_CARDS = 60;
const WIN_INDEX = 48;
const SPIN_DURATION_MS = 6200;

interface RarityStyle {
  label: string;
  color: string;
  bgGradient: string;
  border: string;
  glow: string;
}

const RARITY_STYLES: Record<CaseRarity, RarityStyle> = {
  milspec: {
    label: "Mil-Spec",
    color: "#4b69ff",
    bgGradient: "from-[#4b69ff]/25 via-[#181c28] to-[#12141c]",
    border: "border-[#4b69ff]/60",
    glow: "shadow-[0_0_30px_rgba(75,105,255,0.45)]",
  },
  restricted: {
    label: "Restricted",
    color: "#8847ff",
    bgGradient: "from-[#8847ff]/25 via-[#1b1728] to-[#12141c]",
    border: "border-[#8847ff]/60",
    glow: "shadow-[0_0_30px_rgba(136,71,255,0.45)]",
  },
  classified: {
    label: "Classified",
    color: "#d32ce6",
    bgGradient: "from-[#d32ce6]/25 via-[#241629] to-[#12141c]",
    border: "border-[#d32ce6]/60",
    glow: "shadow-[0_0_35px_rgba(211,44,230,0.5)]",
  },
  covert: {
    label: "Covert",
    color: "#eb4b4b",
    bgGradient: "from-[#eb4b4b]/30 via-[#2a1518] to-[#12141c]",
    border: "border-[#eb4b4b]/70",
    glow: "shadow-[0_0_40px_rgba(235,75,75,0.55)]",
  },
  gold: {
    label: "★ Nadir Özel",
    color: "#ffd700",
    bgGradient: "from-[#ffd700]/35 via-[#2c2410] to-[#12141c]",
    border: "border-[#ffd700]/80",
    glow: "shadow-[0_0_50px_rgba(255,215,0,0.65)]",
  },
};

function pickWeightedWinner(pool: CaseTrackItem[]): CaseTrackItem {
  const weights: Record<CaseRarity, number> = {
    gold: 1.0,
    covert: 2.2,
    classified: 3.4,
    restricted: 4.0,
    milspec: 2.5,
  };
  let total = 0;
  for (const item of pool) {
    total += weights[item.rarity] ?? 1;
  }
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= weights[item.rarity] ?? 1;
    if (roll <= 0) return item;
  }
  return pool[0];
}

function buildReel(pool: CaseTrackItem[], winner: CaseTrackItem): CaseTrackItem[] {
  const reel: CaseTrackItem[] = [];
  for (let i = 0; i < TOTAL_CARDS; i++) {
    if (i === WIN_INDEX) {
      reel.push(winner);
    } else {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      reel.push(rand);
    }
  }
  return reel;
}

interface CaseOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetchPool: () => Promise<CaseTrackItem[]>;
  onPlayNext: (uri: string) => void;
  onPlayNow: (uri: string) => void;
}

type ModalPhase = "loading" | "spinning" | "revealed" | "empty";

export function CaseOpeningModal({
  isOpen,
  onClose,
  onFetchPool,
  onPlayNext,
  onPlayNow,
}: CaseOpeningModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("loading");
  const [reel, setReel] = useState<CaseTrackItem[]>([]);
  const [winner, setWinner] = useState<CaseTrackItem | null>(null);
  const [muted, setMuted] = useState(false);
  const [queuedNext, setQueuedNext] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const onFetchPoolRef = useRef(onFetchPool);
  onFetchPoolRef.current = onFetchPool;
  const onPlayNextRef = useRef(onPlayNext);
  onPlayNextRef.current = onPlayNext;

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startSpin = useCallback(async () => {
    stopAnimation();
    setPhase("loading");
    setWinner(null);
    setQueuedNext(false);
    setReel([]);

    const pool = await onFetchPoolRef.current();
    if (!isOpenRef.current) return;
    if (!pool || pool.length === 0) {
      setPhase("empty");
      return;
    }

    const pickedWinner = pickWeightedWinner(pool);
    const builtReel = buildReel(pool, pickedWinner);
    setWinner(pickedWinner);
    setReel(builtReel);
    setPhase("spinning");
    playCaseUnlockSound(mutedRef.current);
  }, [stopAnimation]);

  // Run the reel animation AFTER React commits the mounted viewport & cards to DOM
  useEffect(() => {
    if (!isOpen || phase !== "spinning" || !winner || reel.length === 0) {
      return;
    }

    const viewportEl = viewportRef.current;
    const trackEl = trackRef.current;
    if (!viewportEl || !trackEl) return;

    const viewportWidth = viewportEl.clientWidth;
    const centerOffset = viewportWidth / 2;

    const winCardEl = trackEl.children[WIN_INDEX] as HTMLElement | undefined;
    const winCardCenter = winCardEl
      ? winCardEl.offsetLeft + winCardEl.offsetWidth / 2
      : WIN_INDEX * STEP + CARD_WIDTH / 2;

    // Subtle off-center landing jitter strictly inside the winning card (±32px)
    const jitter = (Math.random() - 0.5) * 64;
    const startX = Math.max(0, 2 * STEP - centerOffset);
    const endX = winCardCenter + jitter - centerOffset;

    const startTime = performance.now();
    let lastTickIndex = Math.floor((startX + centerOffset) / STEP);

    const step = (now: number) => {
      if (!isOpenRef.current) return;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / SPIN_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 4.35);
      const currentX = startX + (endX - startX) * eased;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${-currentX}px, 0, 0)`;
      }

      const currentIndex = Math.floor((currentX + centerOffset) / STEP);
      if (currentIndex !== lastTickIndex) {
        lastTickIndex = currentIndex;
        playCaseTickSound(t, mutedRef.current);
        if (needleRef.current) {
          needleRef.current.style.filter = "brightness(1.8)";
          window.setTimeout(() => {
            if (needleRef.current) needleRef.current.style.filter = "";
          }, 45);
        }
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setPhase("revealed");
        playCaseRevealSound(winner.rarity, mutedRef.current);
        onPlayNextRef.current(winner.uri);
        setQueuedNext(true);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => stopAnimation();
  }, [isOpen, phase, winner, reel, stopAnimation]);

  useEffect(() => {
    if (!isOpen) {
      stopAnimation();
      return;
    }
    void startSpin();
    return () => stopAnimation();
  }, [isOpen, startSpin, stopAnimation]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const winStyle = winner ? RARITY_STYLES[winner.rarity] : RARITY_STYLES.milspec;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "spinning") onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-gradient-to-b from-[#161922] via-[#101218] to-[#0b0d12] border border-white/15 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Top CS2 Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                <span>TARmusic Şarkı Kasası</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  Zevk Kasası
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Dinleme geçmişine ve zevk analizine göre seçilen parçalar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((prev) => !prev)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title={muted ? "Kasa Seslerini Aç" : "Kasa Seslerini Kapat"}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-5 sm:p-7 space-y-6">
          {phase === "loading" && (
            <div className="h-52 rounded-2xl bg-[#0c0e14] border border-white/10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm font-semibold text-neutral-200">
                Kasa kilidi açılıyor ve zevk havuzu hazırlanıyor...
              </p>
              <p className="text-xs text-neutral-500">
                Dinlediğin türler, Last.fm ve beğeniler analiz ediliyor
              </p>
            </div>
          )}

          {phase === "empty" && (
            <div className="h-52 rounded-2xl bg-[#0c0e14] border border-white/10 flex flex-col items-center justify-center gap-3 text-center px-4">
              <Disc3 className="w-8 h-8 text-neutral-600" />
              <p className="text-sm text-neutral-300">
                Henüz kasa için yeterli dinleme geçmişi yok (veya tüm şarkılar bu
                oturumda çalındı).
              </p>
              <button
                onClick={() => void startSpin()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {(phase === "spinning" || phase === "revealed") && (
            <>
              {/* CS2 Horizontal Roulette Viewport */}
              <div className="relative">
                <div
                  ref={viewportRef}
                  className="relative h-52 w-full overflow-hidden rounded-2xl bg-[#0b0d13] border border-white/15 shadow-inner"
                >
                  {/* Scrolling Track Container */}
                  <div
                    ref={trackRef}
                    className="absolute top-0 left-0 h-full flex items-center will-change-transform"
                    style={{ gap: `${CARD_GAP}px` }}
                  >
                    {reel.map((item, idx) => {
                      const style = RARITY_STYLES[item.rarity];
                      const isWinnerCard = idx === WIN_INDEX;
                      const hideGoldSecret =
                        item.rarity === "gold" &&
                        (phase === "spinning" || !isWinnerCard);

                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          style={{ width: `${CARD_WIDTH}px` }}
                          className={`relative h-44 shrink-0 rounded-xl overflow-hidden bg-gradient-to-b ${style.bgGradient} border transition-all duration-300 flex flex-col justify-between select-none ${
                            phase === "revealed" && isWinnerCard
                              ? `${style.border} ${style.glow} scale-[1.03]`
                              : "border-white/10"
                          }`}
                        >
                          {hideGoldSecret ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                              <div className="w-16 h-16 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center mb-2 shadow-[0_0_25px_rgba(255,215,0,0.3)]">
                                <Crown className="w-8 h-8 text-amber-300" />
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                ★ En Çok Dinlenen ★
                              </p>
                              <p className="text-[10px] text-amber-200/70 mt-0.5">
                                Altın Nadirlik
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="p-2.5 pb-1 flex-1 flex flex-col">
                                <div className="w-full h-24 rounded-lg overflow-hidden bg-black/50 border border-white/10 mb-2">
                                  {item.thumbnail ? (
                                    <img
                                      src={item.thumbnail}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                      <Disc3 className="w-7 h-7" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-white truncate leading-tight">
                                  {item.title}
                                </p>
                                <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                                  {item.artist}
                                </p>
                              </div>
                            </>
                          )}

                          {/* Bottom CS2 Rarity Bar */}
                          <div
                            className="h-1.5 w-full shrink-0"
                            style={{ backgroundColor: style.color }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Side Edge Vignettes */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0b0d13] to-transparent z-10" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0b0d13] to-transparent z-10" />

                  {/* Center Golden Laser Needle */}
                  <div
                    ref={needleRef}
                    className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-between transition-[filter] duration-75"
                  >
                    <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
                    <div className="w-[3px] flex-1 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.95)]" />
                    <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent border-b-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
                  </div>
                </div>
              </div>

              {/* Winner Reveal Card */}
              {phase === "revealed" && winner ? (
                <div
                  className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-r ${winStyle.bgGradient} border ${winStyle.border} ${winStyle.glow} flex flex-col sm:flex-row items-center gap-4 transition-all`}
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/50 border border-white/15 shrink-0 shadow-xl">
                    {winner.thumbnail ? (
                      <img
                        src={winner.thumbnail}
                        alt={winner.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-8 h-8 text-neutral-500" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-black"
                        style={{ backgroundColor: winStyle.color }}
                      >
                        {winStyle.label}
                      </span>
                      <span className="text-[11px] text-neutral-300 bg-black/30 px-2.5 py-0.5 rounded-full border border-white/10">
                        {winner.reason}
                      </span>
                      {queuedNext && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          Sıradaki Şarkı Oldu
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white truncate">
                      {winner.title}
                    </h3>
                    <p className="text-xs text-neutral-300 truncate mt-0.5">
                      {winner.artist}
                      {winner.duration > 0
                        ? ` • ${formatDuration(winner.duration)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onPlayNow(winner.uri);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Hemen Çal
                    </button>
                    <button
                      onClick={() => void startSpin()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4b9e38] hover:bg-[#58b543] text-white text-xs font-bold transition-colors cursor-pointer shadow-lg"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Tekrar Aç
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Kasa dönüyor... Çıkan şarkı otomatik olarak sıranın en
                    başına eklenecek
                  </span>
                  <div className="hidden sm:flex items-center gap-2">
                    {(
                      ["milspec", "restricted", "classified", "covert", "gold"] as CaseRarity[]
                    ).map((r) => (
                      <span
                        key={r}
                        className="inline-block w-3 h-1.5 rounded-full"
                        style={{ backgroundColor: RARITY_STYLES[r].color }}
                        title={RARITY_STYLES[r].label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
