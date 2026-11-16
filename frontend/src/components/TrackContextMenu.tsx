import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Disc3,
  FolderPlus,
  Heart,
  ListPlus,
  Play,
  Plus,
  ThumbsDown,
  Trash2,
} from "lucide-react";
import type {
  CustomPlaylist,
  CustomPlaylistTrack,
  DislikedTrack,
  LikedTrack,
} from "../types";
import { isTrackDisliked, isTrackLiked, normalizeTrackMatchKey } from "../utils";

export interface ContextTrackInput {
  id?: string;
  title: string;
  artist: string;
  thumbnail?: string;
  uri: string;
  duration?: number;
}

export interface TrackContextOptions {
  queueTrackId?: string;
  customPlaylistId?: string;
  customPlaylistTrackId?: string;
}

interface ActiveMenuState {
  x: number;
  y: number;
  track: ContextTrackInput;
  options?: TrackContextOptions;
}

interface TrackMenuContextValue {
  openTrackMenu: (
    e: ReactMouseEvent,
    track: ContextTrackInput,
    options?: TrackContextOptions
  ) => void;
}

const TrackMenuContext = createContext<TrackMenuContextValue>({
  openTrackMenu: () => {},
});

export function useTrackMenu() {
  return useContext(TrackMenuContext);
}

interface TrackMenuProviderProps {
  children: ReactNode;
  likedTracks: LikedTrack[];
  dislikedTracks: DislikedTrack[];
  customPlaylists: CustomPlaylist[];
  onPlayNow: (uri: string) => void;
  onPlayNext: (uri: string) => void;
  onAddTrack: (uri: string) => void;
  onToggleLike: (track: {
    id?: string;
    title: string;
    artist: string;
    thumbnail: string;
    uri: string;
    duration: number;
  }) => void;
  onToggleDislike: (track: {
    id?: string;
    title: string;
    artist: string;
    thumbnail?: string;
    uri?: string;
    duration?: number;
  }) => void;
  onAddToCustomPlaylist: (
    playlistId: string,
    track: Omit<CustomPlaylistTrack, "addedAt">
  ) => void;
  onCreateCustomPlaylistWithTrack: (
    name: string,
    track: Omit<CustomPlaylistTrack, "addedAt">
  ) => Promise<void>;
  onRemoveFromCustomPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromQueue: (trackId: string) => void;
}

export function TrackMenuProvider({
  children,
  likedTracks,
  dislikedTracks,
  customPlaylists,
  onPlayNow,
  onPlayNext,
  onAddTrack,
  onToggleLike,
  onToggleDislike,
  onAddToCustomPlaylist,
  onCreateCustomPlaylistWithTrack,
  onRemoveFromCustomPlaylist,
  onRemoveFromQueue,
}: TrackMenuProviderProps) {
  const [menu, setMenu] = useState<ActiveMenuState | null>(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [copiedUri, setCopiedUri] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => {
    setMenu(null);
    setShowPlaylistPicker(false);
    setNewPlaylistName("");
    setCopiedUri(false);
  }, []);

  const openTrackMenu = useCallback(
    (
      e: ReactMouseEvent,
      track: ContextTrackInput,
      options?: TrackContextOptions
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const menuW = 256;
      const menuH = 380;
      const x = Math.min(e.clientX, Math.max(8, window.innerWidth - menuW - 12));
      const y = Math.min(e.clientY, Math.max(8, window.innerHeight - menuH - 12));

      setShowPlaylistPicker(false);
      setNewPlaylistName("");
      setCopiedUri(false);
      setMenu({ x, y, track, options });
    },
    []
  );

  useEffect(() => {
    if (!menu) return;

    const onMouseDown = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onScroll = () => closeMenu();

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu, closeMenu]);

  const liked = menu ? isTrackLiked(likedTracks, menu.track) : false;
  const disliked = menu ? isTrackDisliked(dislikedTracks, menu.track) : false;

  const toPlaylistPayload = (
    t: ContextTrackInput
  ): Omit<CustomPlaylistTrack, "addedAt"> => ({
    id: t.id || normalizeTrackMatchKey(t),
    title: t.title,
    artist: t.artist,
    thumbnail: t.thumbnail || "",
    uri: t.uri,
    duration: t.duration || 0,
  });

  return (
    <TrackMenuContext.Provider value={{ openTrackMenu }}>
      {children}

      {menu && (
        <div
          ref={menuRef}
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-[100] w-64 bg-[#181818]/98 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-1.5 text-white select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Mini Track Header */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-white/10 mb-1">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
              {menu.track.thumbnail ? (
                <img
                  src={menu.track.thumbnail}
                  alt={menu.track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Disc3 className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {menu.track.title}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {menu.track.artist}
              </p>
            </div>
          </div>

          {menu.track.uri && (
            <>
              <button
                onClick={() => {
                  onPlayNow(menu.track.uri);
                  closeMenu();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-red-400 fill-current" />
                <span>Hemen Çal</span>
              </button>

              <button
                onClick={() => {
                  onPlayNext(menu.track.uri);
                  closeMenu();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5 text-sky-400" />
                <span>Sıradaki Olarak Çal</span>
              </button>

              <button
                onClick={() => {
                  onAddTrack(menu.track.uri);
                  closeMenu();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kuyruğa Ekle</span>
              </button>

              <div className="h-px bg-white/10 my-1" />
            </>
          )}

          {/* Like */}
          <button
            onClick={() => {
              onToggleLike({
                id: menu.track.id,
                title: menu.track.title,
                artist: menu.track.artist,
                thumbnail: menu.track.thumbnail || "",
                uri: menu.track.uri,
                duration: menu.track.duration || 0,
              });
              closeMenu();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 ${liked ? "text-rose-500 fill-current" : "text-neutral-400"}`}
            />
            <span>{liked ? "Beğenilerden Kaldır" : "Beğenilenlere Ekle"}</span>
          </button>

          {/* Dislike / Not interested */}
          <button
            onClick={() => {
              onToggleDislike(menu.track);
              closeMenu();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              disliked
                ? "text-amber-300 hover:bg-amber-500/15"
                : "text-neutral-200 hover:bg-red-500/15 hover:text-red-300"
            }`}
          >
            <ThumbsDown
              className={`w-3.5 h-3.5 ${disliked ? "text-amber-400 fill-current" : "text-neutral-400"}`}
            />
            <span>
              {disliked
                ? "Beğenmedim İşaretini Kaldır"
                : "Beğenmedim (Önerme)"}
            </span>
          </button>

          {/* Add to Custom Playlist */}
          {menu.track.uri && (
            <div>
              <button
                onClick={() => setShowPlaylistPicker((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Çalma Listesine Ekle</span>
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                    showPlaylistPicker ? "rotate-90" : ""
                  }`}
                />
              </button>

              {showPlaylistPicker && (
                <div className="mt-1 mb-1 mx-1 p-1.5 rounded-xl bg-black/40 border border-white/10 space-y-1 max-h-44 overflow-y-auto">
                  {customPlaylists.map((pl) => {
                    const trackKey = normalizeTrackMatchKey(menu.track);
                    const inList = pl.tracks.some(
                      (t) => normalizeTrackMatchKey(t) === trackKey
                    );
                    return (
                      <button
                        key={pl.id}
                        onClick={() => {
                          onAddToCustomPlaylist(
                            pl.id,
                            toPlaylistPayload(menu.track)
                          );
                          closeMenu();
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer text-left"
                      >
                        <span className="truncate">{pl.name}</span>
                        {inList && (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const clean = newPlaylistName.trim();
                      if (!clean) return;
                      void onCreateCustomPlaylistWithTrack(
                        clean,
                        toPlaylistPayload(menu.track)
                      );
                      closeMenu();
                    }}
                    className="flex items-center gap-1 pt-1 border-t border-white/10"
                  >
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Yeni liste adı..."
                      className="flex-1 min-w-0 bg-[#222] text-white text-[11px] px-2 py-1 rounded-lg border border-white/10 focus:border-red-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newPlaylistName.trim()}
                      className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      +
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Contextual Removals */}
          {menu.options?.queueTrackId && (
            <button
              onClick={() => {
                if (menu.options?.queueTrackId) {
                  onRemoveFromQueue(menu.options.queueTrackId);
                }
                closeMenu();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kuyruktan Kaldır</span>
            </button>
          )}

          {menu.options?.customPlaylistId &&
            menu.options?.customPlaylistTrackId && (
              <button
                onClick={() => {
                  if (
                    menu.options?.customPlaylistId &&
                    menu.options?.customPlaylistTrackId
                  ) {
                    onRemoveFromCustomPlaylist(
                      menu.options.customPlaylistId,
                      menu.options.customPlaylistTrackId
                    );
                  }
                  closeMenu();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bu Listeden Çıkar</span>
              </button>
            )}

          {menu.track.uri && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(menu.track.uri);
                  setCopiedUri(true);
                  window.setTimeout(closeMenu, 500);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                {copiedUri ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span>{copiedUri ? "Link Kopyalandı!" : "Şarkı Linkini Kopyala"}</span>
              </button>
            </>
          )}
        </div>
      )}
    </TrackMenuContext.Provider>
  );
}
