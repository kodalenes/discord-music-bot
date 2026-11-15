import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Search, X, Plus, Clock, Check, Loader2 } from "lucide-react";
import type { SearchResult } from "../types";
import { formatDuration } from "../utils";

interface SearchBarProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onAddTrack: (track: { uri: string; title?: string; artist?: string; thumbnail?: string; duration?: number }) => void;
}

export function SearchBar({ onSearch, onAddTrack }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const data = await onSearch(trimmed);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, onSearch]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults([]);
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

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-neutral-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Şarkı, albüm veya sanatçı ara..."
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

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-[460px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-neutral-400 gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              <span>YouTube'da aranıyor...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">
              "{query}" için sonuç bulunamadı
            </div>
          ) : (
            <div className="py-2 divide-y divide-white/5">
              {results.map((item) => {
                const isAdded = addedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 shrink-0 shadow">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <Search className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {item.artist}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-neutral-500 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(item.duration)}</span>
                    </div>

                    <button
                      onClick={() => handleAdd(item)}
                      disabled={isAdded}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
          )}
        </div>
      )}
    </div>
  );
}
