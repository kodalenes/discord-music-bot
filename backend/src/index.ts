import { MusicManager } from "./music/MusicManager.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  let manager: MusicManager;

  const server = createServer(() => manager);

  manager = new MusicManager(
    (state) => {
      server.broadcastState(state);
    },
    (stats) => {
      server.broadcastStats(stats);
    }
  );

  await server.start();
  await manager.start();

  // Periodic position sync while playing so connected clients stay accurate
  const syncInterval = setInterval(() => {
    const state = manager.getState();
    if (state.isPlaying) {
      server.broadcastState(state);
    }
  }, 5000);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[System] Received ${signal}, shutting down gracefully...`);
    clearInterval(syncInterval);
    await manager.destroy();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((err) => {
  console.error("[Fatal] Unhandled startup error:", err);
  process.exit(1);
});
