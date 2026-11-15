import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SavedPlaylist } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "saved-playlists.json");

export class SavedPlaylistsStore {
  private items: SavedPlaylist[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed;
        }
      }
    } catch {
      this.items = [];
    }
  }

  private saveToDisk(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(this.items, null, 2), "utf-8");
  }

  public list(): SavedPlaylist[] {
    return [...this.items];
  }

  public add(playlist: SavedPlaylist): SavedPlaylist[] {
    this.items = [
      playlist,
      ...this.items.filter((item) => item.id !== playlist.id),
    ];
    this.saveToDisk();
    return this.list();
  }

  public remove(id: string): SavedPlaylist[] {
    this.items = this.items.filter((item) => item.id !== id);
    this.saveToDisk();
    return this.list();
  }
}
