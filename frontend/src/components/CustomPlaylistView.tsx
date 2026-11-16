import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Disc3,
  ListMusic,
  ListPlus,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import type {
  BrowseSearchResult,
  CustomPlaylist,
  CustomPlaylistTrack,
} from "../types";
import { formatDuration } from "../utils";
import { useTrackMenu } from "./TrackContextMenu";

interface CustomPlaylistViewProps {
  playlist: CustomPlaylist | null;
  onBack: () => void;
  onUpdatePlaylist: (payload: {
    id: string;
    name: string;
    description?: string;
  }) => void;
  onDeletePlaylist: (id: string) => void;
  onPlayNow: (uri: string) => void;
  onPlayNext: (uri: string) => void;
  onAddTrack: (uri: string) => void;
  onAddAll: (uris: string[]) => void;
  onAddTrackToPlaylist: (
    playlistId: string,
    track: Omit<CustomPlaylistTrack, "addedAt">
  ) => void;
  onRemoveTrack: (playlistId: string, trackId: string) => void;
  onReorderTrack: (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  onBrowseSearch: (query: string) => Promise<BrowseSearchResult>;
}

function formatTotalMinutes(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 dk";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs} sa ${mins} dk`;
  return `${Math.max(1, mins)} dk`;
}

export function CustomPlaylistView({
  playlist,
  onBack,
  onUpdatePlaylist,
  onDeletePlaylist,
  onPlayNow,
  onPlayNext,
  onAddTrack,
  onAddAll,
  onAddTrackToPlaylist,
  onRemoveTrack,
  onReorderTrack,
  onBrowseSearch,
}: CustomPlaylistViewProps) {
  const { openTrackMenu } = useTrackMenu();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [showAddSearch, setShowAddSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BrowseSearchResult | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);

  if (!playlist) {
    return (
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] gap-4 text-neutral-400">
        <p className="text-sm">Çalma listesi bulunamadı veya silindi.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Listelere Dön
        </button>
      </div>
    );
  }

  const totalSeconds = playlist.tracks.reduce(
    (sum, t) => sum + (t.duration || 0),
    0
  );

  const startEdit = () => {
    setEditName(playlist.name);
    setEditDesc(playlist.description || "");
    setIsEditing(true);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    const clean = editName.trim();
    if (!clean) return;
    onUpdatePlaylist({
      id: playlist.id,
      name: clean,
      description: editDesc.trim(),
    });
    setIsEditing(false);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    const res = await onBrowseSearch(q);
    setSearchResults(res);
    setIsSearching(false);
  };

  const handleShufflePlayAll = () => {
    const uris = playlist.tracks.map((t) => t.uri).filter(Boolean);
    for (let i = uris.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uris[i], uris[j]] = [uris[j], uris[i]];
    }
    onAddAll(uris);
  };

  return (
    <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl">
      <div className="relative p-6 bg-gradient-to-b from-red-950/30 via-neutral-900/50 to-[#121212] border-b border-white/5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Listelerime Dön
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Düzenle</span>
            </button>
            <button
              onClick={() => {
                if (confirmDelete) {
                  onDeletePlaylist(playlist.id);
                  onBack();
                } else {
                  setConfirmDelete(true);
                  window.setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                confirmDelete
                  ? "bg-red-600 text-white"
                  : "bg-white/5 hover:bg-red-500/15 text-neutral-300 hover:text-red-300"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmDelete ? "Emin misin?" : "Listeyi Sil"}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-neutral-800 shrink-0 shadow-2xl border border-white/10">
            {playlist.tracks.length >= 4 ? (
              <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                {playlist.tracks.slice(0, 4).map((t, i) => (
                  <img
                    key={`${t.id}-${i}`}
                    src={t.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ))}
              </div>
            ) : playlist.thumbnail ? (
              <img
                src={playlist.thumbnail}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <ListMusic className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-red-400">
              Özel Çalma Listesi
            </span>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-2 space-y-2 max-w-md">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={80}
                  className="w-full bg-[#1e1e1e] text-white text-sm font-semibold px-3 py-2 rounded-xl border border-white/15 focus:border-red-500 focus:outline-none"
                  placeholder="Liste adı"
                  autoFocus
                />
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={200}
                  className="w-full bg-[#1e1e1e] text-neutral-200 text-xs px-3 py-2 rounded-xl border border-white/15 focus:border-red-500 focus:outline-none"
                  placeholder="Açıklama (isteğe bağlı)"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    İptal
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate mt-0.5">
                  {playlist.name}
                </h2>
                {playlist.description && (
                  <p className="text-xs text-neutral-300 mt-1 line-clamp-2">
                    {playlist.description}
                  </p>
                )}
                <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1.5">
                  <span>{playlist.tracks.length} şarkı</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTotalMinutes(totalSeconds)}</span>
                </p>
              </>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {playlist.tracks.length > 0 && (
                <>
                  <button
                    onClick={() => onPlayNow(playlist.tracks[0].uri)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Baştan Çal
                  </button>
                  <button
                    onClick={() =>
                      onAddAll(playlist.tracks.map((t) => t.uri))
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tümünü Ekle
                  </button>
                  <button
                    onClick={handleShufflePlayAll}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Karıştır & Ekle
                  </button>
                </>
              )}

              <button
                onClick={() => setShowAddSearch((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  showAddSearch
                    ? "bg-white text-black border-white"
                    : "bg-white/5 hover:bg-white/15 text-neutral-200 border-white/10"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Listeye Şarkı Ekle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Search to Add Songs Directly */}
      {showAddSearch && (
        <div className="p-4 sm:p-5 bg-[#161616] border-b border-white/10 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Listeye eklemek için şarkı veya sanatçı ara..."
                className="w-full bg-[#222] text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-white/10 focus:border-red-500 focus:outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Ara</span>
            </button>
          </form>

          {searchResults && (
            <div className="max-h-60 overflow-y-auto divide-y divide-white/5 rounded-xl bg-black/30 border border-white/5">
              {searchResults.tracks.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-500">
                  Sonuç bulunamadı.
                </p>
              ) : (
                searchResults.tracks.slice(0, 8).map((item) => {
                  const alreadyAdded = playlist.tracks.some(
                    (t) => t.uri === item.uri || t.id === item.id
                  );
                  return (
                    <div
                      key={item.id}
                      onContextMenu={(e) => openTrackMenu(e, item)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white/5"
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-9 h-9 rounded-lg object-cover bg-neutral-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {item.artist} • {formatDuration(item.duration)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          onAddTrackToPlaylist(playlist.id, {
                            id: item.id,
                            title: item.title,
                            artist: item.artist,
                            thumbnail: item.thumbnail,
                            uri: item.uri,
                            duration: item.duration,
                          })
                        }
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors shrink-0 inline-flex items-center gap-1 ${
                          alreadyAdded
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-white text-black hover:bg-neutral-200"
                        }`}
                      >
                        {alreadyAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Eklendi</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Ekle</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Track List */}
      <div className="p-4 sm:p-6">
        {playlist.tracks.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-neutral-500">
            <Disc3 className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">Bu çalma listesi henüz boş.</p>
            <p className="text-xs text-neutral-600">
              Yukarıdaki &quot;Listeye Şarkı Ekle&quot; butonunu kullanabilir veya
              sitedeki herhangi bir şarkıya sağ tıklayıp listeye ekleyebilirsin.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            {playlist.tracks.map((track, idx) => (
              <div
                key={track.id}
                onContextMenu={(e) =>
                  openTrackMenu(e, track, {
                    customPlaylistId: playlist.id,
                    customPlaylistTrackId: track.id,
                  })
                }
                className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/5 transition-colors group"
              >
                <span className="w-5 text-center text-xs text-neutral-500 font-mono">
                  {idx + 1}
                </span>

                <button
                  onClick={() => onPlayNow(track.uri)}
                  className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0 cursor-pointer group/thumb"
                  title="Hemen Çal"
                >
                  {track.thumbnail && (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </button>

                <button
                  onClick={() => onPlayNow(track.uri)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                  title="Hemen Çal"
                >
                  <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {track.artist}
                  </p>
                </button>

                <span className="hidden sm:inline text-xs text-neutral-500 font-mono shrink-0">
                  {formatDuration(track.duration)}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      idx > 0 && onReorderTrack(playlist.id, idx, idx - 1)
                    }
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                    title="Yukarı Taşı"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      idx < playlist.tracks.length - 1 &&
                      onReorderTrack(playlist.id, idx, idx + 1)
                    }
                    disabled={idx === playlist.tracks.length - 1}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                    title="Aşağı Taşı"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onPlayNext(track.uri)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="Sıradaki Olarak Çal"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onAddTrack(track.uri)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-white cursor-pointer"
                    title="Kuyruğa Ekle"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveTrack(playlist.id, track.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    title="Listeden Çıkar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
