import { randomUUID } from "node:crypto";
import {
  Client,
  GatewayIntentBits,
  type VoiceBasedChannel,
  type VoiceState,
} from "discord.js";
import {
  Connectors,
  LoadType,
  Shoukaku,
  type Node,
  type NodeOption,
  type Player,
  type Track as LavalinkTrack,
} from "shoukaku";
import { config } from "../config.js";
import type {
  LoopMode,
  PlayerState,
  QueueTrack,
  ReorderPayload,
  SearchTrackResult,
} from "../types.js";

const URL_REGEX = /^https?:\/\//i;

export class MusicManager {
  private readonly client: Client;
  private readonly shoukaku: Shoukaku;
  private player: Player | null = null;

  private currentTrack: QueueTrack | null = null;
  private queue: QueueTrack[] = [];
  private history: QueueTrack[] = [];
  private loopMode: LoopMode = "off";
  private paused = false;
  private volume = 80;
  private trackStartTimestamp = 0;
  private pausedPositionMs = 0;

  private discordReady = false;
  private nodeReady = false;
  private isJoining = false;
  private rejoinTimer: NodeJS.Timeout | null = null;

  private readonly onStateChange: (state: PlayerState) => void;

  constructor(onStateChange: (state: PlayerState) => void) {
    this.onStateChange = onStateChange;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    const nodes: NodeOption[] = [
      {
        name: "main",
        url: `${config.lavalink.host}:${config.lavalink.port}`,
        auth: config.lavalink.password,
        secure: false,
      },
    ];

    this.shoukaku = new Shoukaku(new Connectors.DiscordJS(this.client), nodes, {
      moveOnDisconnect: false,
      resume: false,
      voiceConnectionTimeout: 15,
      reconnectTries: 10,
      reconnectInterval: 5,
    });

    this.registerListeners();
  }

  private registerListeners(): void {
    this.client.once("ready", () => {
      console.log(`[Discord] Logged in as ${this.client.user?.tag}`);
      this.discordReady = true;
      void this.ensureVoiceConnection();
    });

    this.client.on("voiceStateUpdate", (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState);
    });

    this.shoukaku.on("ready", (name) => {
      console.log(`[Lavalink] Node "${name}" is ready.`);
      this.nodeReady = true;
      void this.ensureVoiceConnection();
    });

    this.shoukaku.on("error", (name, error) => {
      console.error(`[Lavalink] Node "${name}" error:`, error);
    });

    this.shoukaku.on("close", (name, code, reason) => {
      console.warn(
        `[Lavalink] Node "${name}" closed (code=${code}, reason=${reason}).`
      );
      this.nodeReady = false;
    });

    this.shoukaku.on("disconnect", (name, count) => {
      console.warn(
        `[Lavalink] Node "${name}" disconnected (${count} players affected).`
      );
      this.nodeReady = false;
      this.player = null;
    });
  }

  public async start(): Promise<void> {
    await this.client.login(config.discord.botToken);
  }

  public async destroy(): Promise<void> {
    if (this.rejoinTimer) {
      clearTimeout(this.rejoinTimer);
      this.rejoinTimer = null;
    }

    if (this.player) {
      try {
        await this.shoukaku.leaveVoiceChannel(config.discord.guildId);
      } catch {
        // Ignore leave errors during shutdown
      }
      this.player = null;
    }

    this.client.destroy();
  }

  private handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
    const botId = this.client.user?.id;
    if (!botId) return;

    const targetGuildId = config.discord.guildId;
    const targetChannelId = config.discord.voiceChannelId;

    if (newState.guild.id !== targetGuildId && oldState.guild.id !== targetGuildId) {
      return;
    }

    // Bot itself was disconnected or moved out of the target voice channel
    if (newState.id === botId && newState.channelId !== targetChannelId) {
      console.warn("[Voice] Bot disconnected from target voice channel.");
      this.player = null;
      if (this.hasHumanUsersInTargetChannel()) {
        this.scheduleRejoin();
      }
      return;
    }

    // A human user joined the target voice channel while bot is not connected
    if (
      newState.id !== botId &&
      !newState.member?.user.bot &&
      newState.channelId === targetChannelId &&
      !this.player
    ) {
      this.scheduleRejoin();
    }
  }

  private hasHumanUsersInTargetChannel(): boolean {
    const guild = this.client.guilds.cache.get(config.discord.guildId);
    const channel = guild?.channels.cache.get(
      config.discord.voiceChannelId
    ) as VoiceBasedChannel | undefined;

    if (!channel || !channel.isVoiceBased()) return false;
    return channel.members.some((member) => !member.user.bot);
  }

  private scheduleRejoin(delayMs = 2000): void {
    if (this.rejoinTimer) return;
    this.rejoinTimer = setTimeout(() => {
      this.rejoinTimer = null;
      void this.ensureVoiceConnection();
    }, delayMs);
  }

  public async ensureVoiceConnection(): Promise<Player | null> {
    if (!this.discordReady || !this.nodeReady) return null;
    if (this.player) return this.player;
    if (this.isJoining) return null;

    this.isJoining = true;
    try {
      const guild = this.client.guilds.cache.get(config.discord.guildId);
      if (!guild) {
        console.error(
          `[Voice] Target guild ${config.discord.guildId} not found in cache.`
        );
        return null;
      }

      const channel = guild.channels.cache.get(config.discord.voiceChannelId);
      if (!channel || !channel.isVoiceBased()) {
        console.error(
          `[Voice] Target voice channel ${config.discord.voiceChannelId} not found or not voice-based.`
        );
        return null;
      }

      const me = guild.members.me ?? (await guild.members.fetchMe());
      const perms = channel.permissionsFor(me);
      if (!perms.has(["ViewChannel", "Connect", "Speak"])) {
        console.error(
          `[Voice] Missing permissions in "${channel.name}" (${channel.id}). Required: ViewChannel, Connect, Speak.`
        );
        return null;
      }

      console.log(
        `[Voice] Connecting to "${channel.name}" (${channel.id}) in "${guild.name}"...`
      );

      const player = await this.shoukaku.joinVoiceChannel({
        guildId: guild.id,
        channelId: channel.id,
        shardId: guild.shardId,
        deaf: true,
      });

      this.attachPlayerEvents(player);
      await player.setGlobalVolume(this.volume);
      this.player = player;

      console.log(
        `[Voice] Joined "${channel.name}" (${channel.id}) in "${guild.name}".`
      );

      // Resume playback if a track was queued while disconnected
      if (!this.currentTrack && this.queue.length > 0) {
        await this.playNext();
      }

      return player;
    } catch (error) {
      console.error("[Voice] Failed to join voice channel:", error);
      if (this.hasHumanUsersInTargetChannel()) {
        this.scheduleRejoin(5000);
      }
      return null;
    } finally {
      this.isJoining = false;
    }
  }

  private attachPlayerEvents(player: Player): void {
    player.on("start", () => {
      this.paused = false;
      this.trackStartTimestamp = Date.now();
      this.pausedPositionMs = 0;
      this.emitState();
    });

    player.on("end", (reason) => {
      if (reason.reason === "replaced") return;
      void this.playNext();
    });

    player.on("exception", (error) => {
      console.error("[Player] Track exception:", error);
      void this.playNext();
    });

    player.on("stuck", (data) => {
      console.warn(`[Player] Track stuck (${data.thresholdMs}ms), skipping.`);
      void this.playNext();
    });

    player.on("closed", (data) => {
      console.warn(
        `[Player] Voice WebSocket closed (code=${data.code}, reason=${data.reason}).`
      );
      this.player = null;
      if (this.hasHumanUsersInTargetChannel()) {
        this.scheduleRejoin();
      }
    });
  }

  private getNode(): Node {
    const node = this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
    if (!node) {
      throw new Error("No available Lavalink nodes.");
    }
    return node;
  }

  private toSearchResult(track: LavalinkTrack): SearchTrackResult {
    return {
      id: track.info.identifier,
      title: track.info.title,
      artist: track.info.author,
      duration: Math.floor(track.info.length / 1000),
      thumbnail:
        track.info.artworkUrl ||
        (track.info.sourceName === "youtube"
          ? `https://i.ytimg.com/vi/${track.info.identifier}/hqdefault.jpg`
          : ""),
      uri: track.info.uri || "",
    };
  }

  private toQueueTrack(
    track: LavalinkTrack,
    requester = "Web"
  ): QueueTrack {
    return {
      id: randomUUID(),
      encoded: track.encoded,
      title: track.info.title,
      artist: track.info.author,
      duration: Math.floor(track.info.length / 1000),
      thumbnail:
        track.info.artworkUrl ||
        (track.info.sourceName === "youtube"
          ? `https://i.ytimg.com/vi/${track.info.identifier}/hqdefault.jpg`
          : ""),
      uri: track.info.uri || "",
      requester,
    };
  }

  public async search(query: string): Promise<SearchTrackResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const node = this.getNode();

    if (URL_REGEX.test(trimmed)) {
      const res = await node.rest.resolve(trimmed);
      if (!res) return [];
      if (res.loadType === LoadType.TRACK) {
        return [this.toSearchResult(res.data)];
      }
      if (res.loadType === LoadType.PLAYLIST) {
        return res.data.tracks.slice(0, 15).map((t) => this.toSearchResult(t));
      }
      if (res.loadType === LoadType.SEARCH) {
        return res.data.slice(0, 15).map((t) => this.toSearchResult(t));
      }
      return [];
    }

    // Prioritize YouTube Music (ytmsearch:) with fallback to YouTube (ytsearch:)
    const ytmRes = await node.rest.resolve(`ytmsearch:${trimmed}`);
    if (ytmRes && ytmRes.loadType === LoadType.SEARCH && ytmRes.data.length > 0) {
      return ytmRes.data.slice(0, 10).map((t) => this.toSearchResult(t));
    }

    const ytRes = await node.rest.resolve(`ytsearch:${trimmed}`);
    if (ytRes && ytRes.loadType === LoadType.SEARCH && ytRes.data.length > 0) {
      return ytRes.data.slice(0, 10).map((t) => this.toSearchResult(t));
    }

    return [];
  }

  public async addTrack(uriOrQuery: string, requester = "Web"): Promise<void> {
    const trimmed = uriOrQuery.trim();
    if (!trimmed) {
      throw new Error("Track URI or query is required.");
    }

    const node = this.getNode();
    let res = URL_REGEX.test(trimmed)
      ? await node.rest.resolve(trimmed)
      : await node.rest.resolve(`ytmsearch:${trimmed}`);

    if (
      !URL_REGEX.test(trimmed) &&
      (!res || res.loadType === LoadType.EMPTY || res.loadType === LoadType.ERROR)
    ) {
      res = await node.rest.resolve(`ytsearch:${trimmed}`);
    }

    if (!res || res.loadType === LoadType.EMPTY) {
      throw new Error("No tracks found.");
    }

    if (res.loadType === LoadType.ERROR) {
      throw new Error(res.data.message || "Failed to load track.");
    }

    if (res.loadType === LoadType.TRACK) {
      this.queue.push(this.toQueueTrack(res.data, requester));
    } else if (res.loadType === LoadType.PLAYLIST) {
      for (const track of res.data.tracks) {
        this.queue.push(this.toQueueTrack(track, requester));
      }
    } else if (res.loadType === LoadType.SEARCH) {
      const first = res.data[0];
      if (!first) throw new Error("No tracks found.");
      this.queue.push(this.toQueueTrack(first, requester));
    }

    if (!this.currentTrack) {
      await this.playNext();
    } else {
      this.emitState();
    }
  }

  public async addTracks(uris: string[], requester = "Web"): Promise<void> {
    const cleanUris = uris.map((u) => u.trim()).filter(Boolean);
    if (cleanUris.length === 0) return;

    const first = cleanUris[0];
    if (first) {
      await this.addTrack(first, requester);
    }

    // Resolve remaining tracks sequentially without blocking initial playback
    for (const uri of cleanUris.slice(1)) {
      try {
        await this.addTrack(uri, requester);
      } catch (err) {
        console.warn("[Queue] Skipped track during batch add:", uri, err);
      }
    }
  }

  public async playNow(payload: {
    trackId?: string;
    uri?: string;
    requester?: string;
  }): Promise<void> {
    let target: QueueTrack | null = null;
    const requesterName = payload.requester?.trim() || "Web";

    if (payload.trackId) {
      const idx = this.queue.findIndex((t) => t.id === payload.trackId);
      if (idx === -1) {
        const histIdx = this.history.findIndex((t) => t.id === payload.trackId);
        if (histIdx === -1) return;
        const histTrack = this.history[histIdx];
        if (!histTrack) return;
        target = { ...histTrack, id: randomUUID(), requester: requesterName };
      } else {
        const [removed] = this.queue.splice(idx, 1);
        target = removed ?? null;
      }
    } else if (payload.uri) {
      const node = this.getNode();
      const res = await node.rest.resolve(payload.uri.trim());
      if (res && res.loadType === LoadType.TRACK) {
        target = this.toQueueTrack(res.data, requesterName);
      } else if (
        res &&
        res.loadType === LoadType.SEARCH &&
        res.data[0]
      ) {
        target = this.toQueueTrack(res.data[0], requesterName);
      }
    }

    if (!target) return;

    if (this.currentTrack) {
      this.pushHistory(this.currentTrack);
    }

    const player = await this.ensureVoiceConnection();
    if (!player) {
      this.queue.unshift(target);
      this.emitState();
      return;
    }

    this.currentTrack = target;
    this.paused = false;
    this.pausedPositionMs = 0;
    this.trackStartTimestamp = Date.now();
    await player.playTrack({ track: { encoded: target.encoded } });
    this.emitState();
  }

  private pushHistory(track: QueueTrack): void {
    this.history.unshift(track);
    if (this.history.length > 25) {
      this.history.length = 25;
    }
  }

  private async playNext(): Promise<void> {
    const finished = this.currentTrack;

    if (finished && this.loopMode === "track") {
      const player = await this.ensureVoiceConnection();
      if (player) {
        this.paused = false;
        this.pausedPositionMs = 0;
        this.trackStartTimestamp = Date.now();
        await player.playTrack({ track: { encoded: finished.encoded } });
        this.emitState();
        return;
      }
    }

    if (finished) {
      this.pushHistory(finished);
      if (this.loopMode === "queue") {
        this.queue.push({ ...finished, id: randomUUID() });
      }
    }

    const next = this.queue.shift() ?? null;
    this.currentTrack = next;
    this.paused = false;
    this.pausedPositionMs = 0;

    if (!next) {
      this.trackStartTimestamp = 0;
      this.emitState();
      return;
    }

    const player = await this.ensureVoiceConnection();
    if (!player) {
      // Put track back at the front if voice connection is not ready yet
      this.queue.unshift(next);
      this.currentTrack = null;
      this.emitState();
      return;
    }

    this.trackStartTimestamp = Date.now();
    await player.playTrack({ track: { encoded: next.encoded } });
    this.emitState();
  }

  public async previous(): Promise<void> {
    const prevTrack = this.history.shift();
    if (!prevTrack) return;

    if (this.currentTrack) {
      this.queue.unshift(this.currentTrack);
    }

    const player = await this.ensureVoiceConnection();
    if (!player) {
      this.queue.unshift(prevTrack);
      this.emitState();
      return;
    }

    this.currentTrack = prevTrack;
    this.paused = false;
    this.pausedPositionMs = 0;
    this.trackStartTimestamp = Date.now();
    await player.playTrack({ track: { encoded: prevTrack.encoded } });
    this.emitState();
  }

  public shuffle(): void {
    if (this.queue.length < 2) return;
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.queue[i];
      const swap = this.queue[j];
      if (temp && swap) {
        this.queue[i] = swap;
        this.queue[j] = temp;
      }
    }
    this.emitState();
  }

  public setLoop(mode?: LoopMode): LoopMode {
    if (mode) {
      this.loopMode = mode;
    } else {
      const order: LoopMode[] = ["off", "queue", "track"];
      const nextIdx = (order.indexOf(this.loopMode) + 1) % order.length;
      this.loopMode = order[nextIdx] ?? "off";
    }
    this.emitState();
    return this.loopMode;
  }

  public removeTrack(trackId: string): void {
    const index = this.queue.findIndex((t) => t.id === trackId);
    if (index === -1) return;
    this.queue.splice(index, 1);
    this.emitState();
  }

  public reorderTrack(payload: ReorderPayload): void {
    let from = payload.fromIndex;
    let to = payload.toIndex;

    if (
      (from === undefined || to === undefined) &&
      payload.trackId &&
      payload.direction
    ) {
      const idx = this.queue.findIndex((t) => t.id === payload.trackId);
      if (idx === -1) return;
      from = idx;
      to = payload.direction === "up" ? idx - 1 : idx + 1;
    }

    if (
      from === undefined ||
      to === undefined ||
      from < 0 ||
      to < 0 ||
      from >= this.queue.length ||
      to >= this.queue.length ||
      from === to
    ) {
      return;
    }

    const [moved] = this.queue.splice(from, 1);
    if (!moved) return;
    this.queue.splice(to, 0, moved);
    this.emitState();
  }

  public async togglePause(): Promise<void> {
    if (!this.player || !this.currentTrack) return;

    const nextPaused = !this.paused;
    if (nextPaused) {
      this.pausedPositionMs = this.getCurrentPositionMs();
    } else {
      this.trackStartTimestamp = Date.now() - this.pausedPositionMs;
    }

    await this.player.setPaused(nextPaused);
    this.paused = nextPaused;
    this.emitState();
  }

  public async skip(): Promise<void> {
    if (!this.player || !this.currentTrack) return;
    await this.player.stopTrack();
  }

  public async seek(positionSeconds: number): Promise<void> {
    if (!this.player || !this.currentTrack) return;

    const clampedSec = Math.max(
      0,
      Math.min(positionSeconds, this.currentTrack.duration)
    );
    const positionMs = Math.floor(clampedSec * 1000);

    await this.player.seekTo(positionMs);
    if (this.paused) {
      this.pausedPositionMs = positionMs;
    } else {
      this.trackStartTimestamp = Date.now() - positionMs;
    }
    this.emitState();
  }

  public async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.volume = clamped;
    if (this.player) {
      await this.player.setGlobalVolume(clamped);
    }
    this.emitState();
  }

  private getCurrentPositionMs(): number {
    if (!this.currentTrack) return 0;
    if (this.paused) return this.pausedPositionMs;
    if (this.trackStartTimestamp === 0) return 0;
    const elapsed = Date.now() - this.trackStartTimestamp;
    return Math.max(0, Math.min(elapsed, this.currentTrack.duration * 1000));
  }

  public getState(): PlayerState {
    return {
      currentTrack: this.currentTrack,
      queue: [...this.queue],
      history: [...this.history],
      paused: this.paused,
      isPlaying: Boolean(this.currentTrack && !this.paused),
      position: Math.floor(this.getCurrentPositionMs() / 1000),
      volume: this.volume,
      loopMode: this.loopMode,
    };
  }

  private emitState(): void {
    this.onStateChange(this.getState());
  }
}
