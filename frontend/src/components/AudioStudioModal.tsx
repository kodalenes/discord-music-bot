import { useEffect, useRef, useState } from "react";
import { RotateCcw, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { AudioFilterPreset, CustomAudioSettings } from "../types";

export const AUDIO_PRESET_LIST: { id: AudioFilterPreset; label: string }[] = [
  { id: "off", label: "Normal" },
  { id: "bassboost", label: "Bass Boost" },
  { id: "subbass", label: "Sub-Bass" },
  { id: "nightcore", label: "Nightcore" },
  { id: "vaporwave", label: "Vaporwave" },
  { id: "8d", label: "8D Audio" },
  { id: "lofi", label: "Lo-Fi" },
  { id: "rock", label: "Rock" },
  { id: "pop", label: "Pop" },
  { id: "club", label: "Club" },
  { id: "soft", label: "Yumuşak" },
  { id: "karaoke", label: "Karaoke" },
];

const DEFAULT_SETTINGS: CustomAudioSettings = {
  preset: "off",
  eqBands: [0, 0, 0, 0, 0, 0],
  speed: 1.0,
  pitch: 1.0,
  rotationHz: 0,
  lowPass: 0,
  tremolo: false,
  karaoke: false,
};

const EQ_BAND_LABELS = [
  { label: "Sub", freq: "40Hz" },
  { label: "Bass", freq: "100Hz" },
  { label: "LowMid", freq: "250Hz" },
  { label: "Vokal", freq: "1kHz" },
  { label: "HighMid", freq: "4kHz" },
  { label: "Tiz", freq: "12kHz" },
];

interface AudioStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioSettings?: CustomAudioSettings;
  activePreset: AudioFilterPreset;
  onSelectPreset: (preset: AudioFilterPreset) => void;
  onApplySettings: (settings: CustomAudioSettings) => void;
}

export function AudioStudioModal({
  isOpen,
  onClose,
  audioSettings,
  activePreset,
  onSelectPreset,
  onApplySettings,
}: AudioStudioModalProps) {
  const [local, setLocal] = useState<CustomAudioSettings>(
    audioSettings ?? DEFAULT_SETTINGS
  );
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (audioSettings) {
      setLocal(audioSettings);
    }
  }, [audioSettings]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scheduleApply = (next: CustomAudioSettings) => {
    setLocal(next);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onApplySettings(next);
    }, 110);
  };

  const updateBand = (index: number, value: number) => {
    const nextBands: [number, number, number, number, number, number] = [
      ...local.eqBands,
    ] as [number, number, number, number, number, number];
    nextBands[index] = value;
    scheduleApply({
      ...local,
      preset: "custom",
      eqBands: nextBands,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Ses Stüdyosu & Ekolayzer
              </h2>
              <p className="text-xs text-neutral-400">
                Hazır mod seçin veya 6 bant EQ ve efektleri canlı özelleştirin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLocal(DEFAULT_SETTINGS);
                onSelectPreset("off");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Tüm efektleri sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Hazır Ses Modları
            </span>
            {activePreset === "custom" && (
              <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/25">
                Özel Ayar Aktif
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AUDIO_PRESET_LIST.map((p) => {
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPreset(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow"
                      : "bg-white/5 text-neutral-300 hover:bg-white/15 hover:text-white border border-white/5"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6-Band Graphic EQ */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              6 Bantlı Ekolayzer
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              -25% .. +50%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {EQ_BAND_LABELS.map((band, idx) => {
              const val = local.eqBands[idx] ?? 0;
              const pct = Math.round(val * 100);
              return (
                <div key={band.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-200 font-medium">
                      {band.label}{" "}
                      <span className="text-neutral-500 font-mono text-[11px]">
                        ({band.freq})
                      </span>
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        pct > 0
                          ? "text-emerald-400"
                          : pct < 0
                            ? "text-amber-400"
                            : "text-neutral-400"
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.25}
                    max={0.5}
                    step={0.02}
                    value={val}
                    onChange={(e) => updateBand(idx, Number(e.target.value))}
                    className="w-full h-1.5 accent-red-500 bg-white/10 rounded-full cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Timescale & Spatial Effects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
              Hız & Perde (Timescale)
            </span>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Hız (Speed)</span>
                <span className="font-mono text-white font-semibold">
                  {local.speed.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.02}
                value={local.speed}
                onChange={(e) =>
                  scheduleApply({
                    ...local,
                    preset: "custom",
                    speed: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 accent-red-500 bg-white/10 rounded-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Perde / Ton (Pitch)</span>
                <span className="font-mono text-white font-semibold">
                  {local.pitch.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.02}
                value={local.pitch}
                onChange={(e) =>
                  scheduleApply({
                    ...local,
                    preset: "custom",
                    pitch: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 accent-red-500 bg-white/10 rounded-full cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
              Uzamsal & Atmosfer Efektleri
            </span>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">8D Dönüş Hızı</span>
                <span className="font-mono text-white font-semibold">
                  {local.rotationHz > 0
                    ? `${local.rotationHz.toFixed(2)} Hz`
                    : "Kapalı"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.02}
                value={local.rotationHz}
                onChange={(e) =>
                  scheduleApply({
                    ...local,
                    preset: "custom",
                    rotationHz: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 accent-sky-400 bg-white/10 rounded-full cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">Lo-Fi Sıcaklık (LowPass)</span>
                <span className="font-mono text-white font-semibold">
                  {local.lowPass > 0 ? `${Math.round(local.lowPass)}` : "Kapalı"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={local.lowPass}
                onChange={(e) =>
                  scheduleApply({
                    ...local,
                    preset: "custom",
                    lowPass: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 accent-amber-400 bg-white/10 rounded-full cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  scheduleApply({
                    ...local,
                    preset: "custom",
                    tremolo: !local.tremolo,
                  })
                }
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  local.tremolo
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-white/5 text-neutral-400 border-white/10 hover:text-white"
                }`}
              >
                Tremolo {local.tremolo ? "Açık" : "Kapalı"}
              </button>
              <button
                onClick={() =>
                  scheduleApply({
                    ...local,
                    preset: "custom",
                    karaoke: !local.karaoke,
                  })
                }
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  local.karaoke
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-white/5 text-neutral-400 border-white/10 hover:text-white"
                }`}
              >
                Karaoke {local.karaoke ? "Açık" : "Kapalı"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
