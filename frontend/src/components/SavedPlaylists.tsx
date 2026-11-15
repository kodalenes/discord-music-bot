import { useState, type FormEvent } from "react";
import { ListMusic, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import type { SavedPlaylist } from "../types";

interface SavedPlaylistsProps {
  playlists: SavedPlaylist[];
  onSavePlaylist: (
    urlOrId: string
  ) => Promise<{ ok: boolean; playlist?: SavedPlaylist; error?: string }>;
  onDeletePlaylist: (id: string) => void;
  onOpenPlaylist: (id: string) => void;
}

export function SavedPlaylists({
  playlists,
  onSavePlaylist,
  onDeletePlaylist,
  onOpenPlaylist,
}: SavedPlaylistsProps) {
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    setErrorMsg(null);
    const res = await onSavePlaylist(trimmed);
    setIsSaving(false);

    if (res.ok) {
      setInput("");
    } else {
      setErrorMsg(res.error || "Liste kaydedilemedi.");
    }
  };

  return (
    <div className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-red-500" />
          Kayıtlı Çalma Listeleri
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          YouTube veya YouTube Music çalma listesi linkini (liste herkese açık
          veya liste dışı olmalı) yapıştırıp kaydedebilirsin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://music.youtube.com/playlist?list=PL..."
          className="flex-1 bg-[#1e1e1e] text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:border-red-500 focus:outline-none placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={isSaving || !input.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer shrink-0"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>Listeyi Kaydet</span>
        </button>
      </form>

      {errorMsg && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {errorMsg}
        </p>
      )}

      {playlists.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-500 border border-dashed border-white/10 rounded-2xl">
          Henüz kayıtlı çalma listesi yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-colors group"
            >
              <button
                onClick={() => onOpenPlaylist(pl.id)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt={pl.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
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

              {pl.url && (
                <a
                  href={pl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                  title="YouTube'da Aç"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={() => onDeletePlaylist(pl.id)}
                className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Listeyi Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
