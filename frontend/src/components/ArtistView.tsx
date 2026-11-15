import {
  ArrowLeft,
  Play,
  Plus,
  Disc,
  Loader2,
  Music2,
  User,
} from "lucide-react";
import type { ArtistProfile } from "../types";
import { formatDuration } from "../utils";

interface ArtistViewProps {
  profile: ArtistProfile | null;
  isLoading: boolean;
  onBack: () => void;
  onAddTrack: (uri: string) => void;
  onAddAll: (uris: string[]) => void;
  onPlayNow: (uri: string) => void;
  onOpenPlaylist: (id: string, isAlbum: boolean) => void;
}

export function ArtistView({
  profile,
  isLoading,
  onBack,
  onAddTrack,
  onAddAll,
  onPlayNow,
  onOpenPlaylist,
}: ArtistViewProps) {
  if (isLoading) {
    return (
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[340px] gap-3 text-neutral-400">
        <Loader2 className="w-7 h-7 animate-spin text-red-500" />
        <span className="text-sm">Sanatçı profili yükleniyor...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] gap-4 text-neutral-400">
        <p className="text-sm">Sanatçı profili yüklenemedi.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl">
      {/* Header */}
      <div className="relative p-6 bg-gradient-to-b from-red-950/35 to-[#121212] border-b border-white/5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-neutral-300 hover:text-white text-xs font-medium mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kuyruğa Dön
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-800 shrink-0 shadow-2xl border border-white/10">
            {profile.thumbnail ? (
              <img
                src={profile.thumbnail}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-red-400">
              Sanatçı
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white truncate mt-0.5">
              {profile.name}
            </h2>
            {profile.description && (
              <p className="text-xs text-neutral-400 line-clamp-2 mt-1.5">
                {profile.description}
              </p>
            )}
            {profile.topSongs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => onPlayNow(profile.topSongs[0].uri)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-red-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  İlk Şarkıyı Çal
                </button>
                <button
                  onClick={() =>
                    onAddAll(profile.topSongs.map((song) => song.uri))
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tüm Popülerleri Ekle ({profile.topSongs.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Songs */}
      <div className="p-5 sm:p-6 space-y-6">
        {profile.topSongs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Music2 className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">
                Popüler Şarkılar
              </h3>
            </div>
            <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
              {profile.topSongs.map((song, idx) => (
                <div
                  key={`${song.id}-${idx}`}
                  className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/5 transition-colors group"
                >
                  <span className="w-5 text-center text-xs text-neutral-500 font-mono">
                    {idx + 1}
                  </span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                    {song.thumbnail && (
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {song.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {song.artist || profile.name}
                      {song.duration > 0
                        ? ` • ${formatDuration(song.duration)}`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onPlayNow(song.uri)}
                    className="p-2 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all cursor-pointer"
                    title="Şimdi Çal"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => onAddTrack(song.uri)}
                    className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold transition-all cursor-pointer"
                    title="Kuyruğa Ekle"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Albums / Singles */}
        {profile.albums.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Disc className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white">
                Albümler & Tekliler
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => onOpenPlaylist(album.id, album.isAlbum)}
                  className="text-left p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer group"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-neutral-800 mb-2">
                    {album.thumbnail ? (
                      <img
                        src={album.thumbnail}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Disc className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                    {album.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {album.author || "Albüm"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
