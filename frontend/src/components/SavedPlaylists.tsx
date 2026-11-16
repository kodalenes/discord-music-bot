import { useState, type FormEvent } from "react";
import {
  CopyPlus,
  ExternalLink,
  FolderPlus,
  ListMusic,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { CustomPlaylist, SavedPlaylist } from "../types";

interface SavedPlaylistsProps {
  playlists: SavedPlaylist[];
  customPlaylists: CustomPlaylist[];
  onSavePlaylist: (
    urlOrId: string
  ) => Promise<{ ok: boolean; playlist?: SavedPlaylist; error?: string }>;
  onDeletePlaylist: (id: string) => void;
  onOpenPlaylist: (id: string) => void;
  onCreateCustomPlaylist: (payload: {
    name: string;
    description?: string;
  }) => Promise<{ ok: boolean; playlist?: CustomPlaylist; error?: string }>;
  onDeleteCustomPlaylist: (id: string) => void;
  onOpenCustomPlaylist: (id: string) => void;
  onCloneSavedPlaylist: (pl: SavedPlaylist) => Promise<void>;
}

export function SavedPlaylists({
  playlists,
  customPlaylists,
  onSavePlaylist,
  onDeletePlaylist,
  onOpenPlaylist,
  onCreateCustomPlaylist,
  onDeleteCustomPlaylist,
  onOpenCustomPlaylist,
  onCloneSavedPlaylist,
}: SavedPlaylistsProps) {
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

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

  const handleCreateCustom = async (e: FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean || isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    const res = await onCreateCustomPlaylist({
      name: clean,
      description: newDesc.trim(),
    });
    setIsCreating(false);

    if (res.ok && res.playlist) {
      setNewName("");
      setNewDesc("");
      onOpenCustomPlaylist(res.playlist.id);
    } else {
      setCreateError(res.error || "Liste oluşturulamadı.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom Editable Playlists */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-red-500" />
            Site İçi Özel Çalma Listelerim
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Sıfırdan liste oluşturabilir, sitedeki herhangi bir şarkıya sağ
            tıklayıp ekleyebilir veya YouTube listelerini kopyalayıp düzenleyebilirsin.
          </p>
        </div>

        <form
          onSubmit={handleCreateCustom}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            placeholder="Yeni liste adı (örn. Gece Sürüşü)"
            className="flex-1 bg-[#1e1e1e] text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:border-red-500 focus:outline-none placeholder:text-neutral-500"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            maxLength={200}
            placeholder="Açıklama (isteğe bağlı)"
            className="sm:w-56 bg-[#1e1e1e] text-white text-sm px-4 py-2.5 rounded-xl border border-white/10 focus:border-red-500 focus:outline-none placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 disabled:opacity-40 text-xs font-semibold transition-all cursor-pointer shrink-0"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Liste Oluştur</span>
          </button>
        </form>

        {createError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {createError}
          </p>
        )}

        {customPlaylists.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 border border-dashed border-white/10 rounded-2xl">
            Henüz özel çalma listen yok. Yukarıdan oluşturabilir veya aşağıdaki
            bir YouTube listesini düzenlenebilir olarak kopyalayabilirsin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customPlaylists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-colors group"
              >
                <button
                  onClick={() => onOpenCustomPlaylist(pl.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 shrink-0">
                    {pl.tracks.length >= 4 ? (
                      <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                        {pl.tracks.slice(0, 4).map((t, i) => (
                          <img
                            key={`${t.id}-${i}`}
                            src={t.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ))}
                      </div>
                    ) : pl.thumbnail ? (
                      <img
                        src={pl.thumbnail}
                        alt={pl.name}
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
                      {pl.name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {pl.tracks.length} şarkı
                      {pl.description ? ` • ${pl.description}` : ""}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => onDeleteCustomPlaylist(pl.id)}
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

      {/* Saved External YouTube Playlists */}
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-red-500" />
            YouTube Linkinden Kaydedilen Listeler
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            YouTube veya YouTube Music çalma listesi linkini yapıştırıp kaydet.
            Üzerindeki{" "}
            <span className="text-neutral-200 font-medium">
              Düzenlenebilir Kopya
            </span>{" "}
            butonuyla tüm şarkılarını kendi özel listene aktarabilirsin.
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
            Henüz linkten kaydedilmiş çalma listesi yok.
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

                <button
                  onClick={async () => {
                    setCloningId(pl.id);
                    await onCloneSavedPlaylist(pl);
                    setCloningId(null);
                  }}
                  disabled={cloningId === pl.id}
                  className="p-2 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title="Düzenlenebilir Özel Listeye Kopyala"
                >
                  {cloningId === pl.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CopyPlus className="w-4 h-4" />
                  )}
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
    </div>
  );
}
