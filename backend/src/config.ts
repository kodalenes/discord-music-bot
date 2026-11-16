import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env (two levels up from backend/src/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export const config = {
  port: 3001,
  corsOrigins: ["https://muzik.ikarusgg.me", "http://localhost:5173"],
  discord: {
    botToken: requireEnv("DISCORD_BOT_TOKEN"),
    guildId: requireEnv("DISCORD_GUILD_ID"),
    voiceChannelId: requireEnv("DISCORD_VOICE_CHANNEL_ID"),
  },
  lavalink: {
    host: process.env.LAVALINK_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.LAVALINK_PORT?.trim() || "2333"),
    password: process.env.LAVALINK_PASSWORD?.trim() || "youshallnotpass",
  },
  appAccessPin: requireEnv("APP_ACCESS_PIN"),
  lastfmApiKey: process.env.LASTFM_API_KEY?.trim() || "",
} as const;
