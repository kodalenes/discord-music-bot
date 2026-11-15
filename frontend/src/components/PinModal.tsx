import { useState, type FormEvent } from "react";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";

interface PinModalProps {
  onSuccess: (pin: string) => void;
  error?: string | null;
}

export function PinModal({ onSuccess, error }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setLocalError("Lütfen bir PIN girin");
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    onSuccess(cleanPin);
    setSubmitting(false);
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030303]/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-8 shadow-2xl transition-all">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/Ikarus_Logo.webp"
            alt="ikarusgg"
            className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-xl border border-white/10"
          />
          <h2 className="text-2xl font-bold tracking-tight text-white">muzik.ikarusgg.me</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Müzik merkezine erişmek için erişim PIN kodunu girin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Erişim PIN Kodu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (displayError) setLocalError(null);
                }}
                placeholder="••••"
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-base tracking-widest placeholder:text-neutral-600 placeholder:tracking-normal focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-colors"
              />
            </div>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !pin.trim()}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100 transition-all cursor-pointer"
          >
            <span>{submitting ? "Bağlanıyor..." : "Giriş Yap"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Bu oturum için PIN tarayıcınızda (localStorage) güvenle saklanır.
        </p>
      </div>
    </div>
  );
}
