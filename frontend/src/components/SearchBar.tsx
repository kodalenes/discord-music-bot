import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  Search,
  X,
  Plus,
  Play,
  Clock,
  Check,
  Loader2,
  User,
  ListMusic,
  ListPlus,
  ChevronRight,
} from "lucide-react";
import type {
  ArtistSearchResult,
  BrowseSearchResult,
  PlaylistSearchResult,
  SearchResult,
} from "../types";
import { formatDuration } from "../utils";
import { useTrackMenu } from "./TrackContextMenu";

type SearchTab = "tracks" | "artists" | "playlists";

interface SearchBarProps {
  onBrowseSearch: (query: string) => Promise<BrowseSearchResult>;
  onAddTrack: (track: {
    uri: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
    duration?: number;
  }) => void;
  onPlayNow: (uri: string) => void;
  onPlayNext?: (uri: string) => void;
  onOpenArtist: (artistId: string) => void;
  onOpenPlaylist: (idOrUrl: string, isAlbum?: boolean) => void;
}

const EMPTY_RESULTS: BrowseSearchResult = {
  tracks: [],
  artists: [],
  playlists: [],
};

export function SearchBar({
  onBrowseSearch,
  onAddTrack,
  onPlayNow,
  onPlayNext,
  onOpenArtist,
  onOpenPlaylist,
}: SearchBarProps) {
  const { openTrackMenu } = useTrackMenu();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("tracks");
  const [results, setResults] = useState<BrowseSearchResult>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const data = await onBrowseSearch(trimmed);
        setResults(data);
      } catch {
        setResults(EMPTY_RESULTS);
      } finally {
        setIsLoading(false);
      }
    }, 380);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, onBrowseSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults(EMPTY_RESULTS);
    setIsOpen(false);
  };

  const handleAdd = (item: SearchResult) => {
    onAddTrack({
      uri: item.uri,
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnail,
      duration: item.duration,
    });

    setAddedIds((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  };

  const handleArtistClick = (artist: ArtistSearchResult) => {
    setIsOpen(false);
    onOpenArtist(artist.id);
  };

  const handlePlaylistClick = (pl: PlaylistSearchResult) => {
    setIsOpen(false);
    onOpenPlaylist(pl.id, pl.isAlbum);
  };

  const totalCount =
    results.tracks.length + results.artists.length + results.playlists.length;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-neutral-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
          onFocus={() => {
            if (totalCount > 0 || query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Şarkı, sanatçı veya çalma listesi ara..."
          className="w-full bg-[#1e1e1e]/90 hover:bg-[#252525] focus:bg-[#252525] text-white text-sm sm:text-base pl-12 pr-11 py-3 rounded-full border border-white/5 focus:border-white/20 focus:outline-none transition-all shadow-lg placeholder:text-neutral-500"
        />
        {query ? (
          <button
            onClick={handleClear}
            className="absolute right-3.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Temizle"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-white/10 bg-[#161616]">
            <button
              onClick={() => setActiveTab("tracks")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "tracks"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Şarkılar ({results.tracks.length})
            </button>
            <button
              onClick={() => setActiveTab("artists")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "artists"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Sanatçılar ({results.artists.length})
            </button>
            <button
              onClick={() => setActiveTab("playlists")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "playlists"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Çalma Listeleri ({results.playlists.length})
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-neutral-400 gap-2 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                <span>YouTube Music'te aranıyor...</span>
              </div>
            ) : activeTab === "tracks" ? (
              results.tracks.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  "{query}" için şarkı bulunamadı
                </div>
              ) : (
                <div className="py-1.5 divide-y divide-white/5">
                  {results.tracks.map((item) => {
                    const isAdded = addedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onContextMenu={(e) => openTrackMenu(e, item)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                      >
                        <button
                          onClick={() => {
                            onPlayNow(item.uri);
                            setIsOpen(false);
                          }}
                          className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0 shadow cursor-pointer group/thumb"
                          title="Şimdi Çal"
                        >
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                              <Search className="w-4 h-4" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-current" />
                          </div>
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">
                            {item.artist}
                          </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-500 shrink-0 mr-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDuration(item.duration)}</span>
                        </div>

                        <button
                          onClick={() => {
                            onPlayNow(item.uri);
                            setIsOpen(false);
                          }}
                          className="shrink-0 p-2 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all cursor-pointer"
                          title="Şimdi Çal"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {onPlayNext && (
                          <button
                            onClick={() => {
                              onPlayNext(item.uri);
                              setIsOpen(false);
                            }}
                            className="shrink-0 p-2 rounded-full bg-white/5 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
                            title="Sıradaki Olarak Çal"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleAdd(item)}
                          disabled={isAdded}
                          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isAdded
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/10 hover:bg-white text-white hover:text-black active:scale-95"
                          }`}
                          title="Kuyruğa Ekle"
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Eklendi</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Ekle</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === "artists" ? (
              results.artists.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  "{query}" için sanatçı bulunamadı
                </div>
              ) : (
                <div className="py-1.5 divide-y divide-white/5">
                  {results.artists.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => handleArtistClick(artist)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 shrink-0 shadow">
                        {artist.thumbnail ? (
                          <img
                            src={artist.thumbnail}
                            alt={artist.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                          {artist.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {artist.subscribers || "Sanatçı"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white shrink-0" />
                    </button>
                  ))}
                </div>
              )
            ) : results.playlists.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                "{query}" için çalma listesi bulunamadı
              </div>
            ) : (
              <div className="py-1.5 divide-y divide-white/5">
                {results.playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handlePlaylistClick(pl)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0 shadow">
                      {pl.thumbnail ? (
                        <img
                          src={pl.thumbnail}
                          alt={pl.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                          <ListMusic className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                        {pl.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {[pl.author, pl.itemCount].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
