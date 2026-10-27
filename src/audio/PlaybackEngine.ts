import type { PlaybackSession, TrackEntry, TrackId } from "../domain/models";
import { AudioGraph } from "./AudioGraph";

export interface PlaybackRuntime {
  createAudioElement(): HTMLAudioElement;
  createAudioContext(): AudioContext;
  createObjectUrl(file: File): string;
  revokeObjectUrl(url: string): void;
}

const browserRuntime: PlaybackRuntime = {
  createAudioElement: () => new Audio(),
  createAudioContext: () => {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextConstructor === undefined) {
      throw new Error("Web Audio API is unavailable in this browser.");
    }
    return new AudioContextConstructor();
  },
  createObjectUrl: (file) => URL.createObjectURL(file),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
};

function validDuration(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function validTime(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function initialSession(): PlaybackSession {
  return {
    trackId: null,
    state: "empty",
    currentTimeSeconds: 0,
    durationSeconds: null,
    volume: 1,
  };
}

/** Single-active-track HTML media playback and local Web Audio analysis graph. */
export class PlaybackEngine {
  readonly audioElement: HTMLAudioElement;
  readonly graph: AudioGraph;
  private session = initialSession();
  private activeUrl: string | null = null;
  private disposed = false;
  private readonly listeners = new Set<(session: PlaybackSession) => void>();
  private readonly eventHandlers: Array<[string, EventListener]>;

  constructor(runtime: PlaybackRuntime = browserRuntime) {
    this.audioElement = runtime.createAudioElement();
    this.runtime = runtime;
    const context = runtime.createAudioContext();
    this.graph = new AudioGraph(this.audioElement, context);
    this.eventHandlers = [
      ["timeupdate", this.onTimeUpdate],
      ["durationchange", this.onDurationChange],
      ["loadedmetadata", this.onDurationChange],
      ["ended", this.onEnded],
      ["error", this.onMediaError],
    ];
    for (const [type, handler] of this.eventHandlers) {
      this.audioElement.addEventListener(type, handler);
    }
  }

  private readonly runtime: PlaybackRuntime;

  getSnapshot(): PlaybackSession {
    return { ...this.session };
  }

  getActiveObjectUrl(): string | null {
    return this.activeUrl;
  }

  subscribe(listener: (session: PlaybackSession) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  loadTrack(track: TrackEntry): boolean {
    if (
      this.disposed ||
      (track.state !== "ready" &&
        track.state !== "active" &&
        track.state !== "resource-error")
    ) {
      return false;
    }
    this.releaseActiveTrack();
    try {
      this.activeUrl = this.runtime.createObjectUrl(track.file);
      this.audioElement.src = this.activeUrl;
      this.audioElement.load();
      this.update({
        trackId: track.id,
        state: "loading",
        currentTimeSeconds: 0,
        durationSeconds: null,
        volume: this.session.volume,
      });
      return true;
    } catch {
      this.releaseActiveTrack();
      this.update({ ...initialSession(), state: "error" });
      return false;
    }
  }

  async play(): Promise<boolean> {
    if (this.disposed || this.session.trackId === null) return false;
    try {
      if (this.graph.context.state === "suspended") {
        await this.graph.context.resume();
      }
      await this.audioElement.play();
      this.update({ ...this.session, state: "playing" });
      return true;
    } catch {
      this.update({ ...this.session, state: "error" });
      return false;
    }
  }

  pause(): void {
    if (this.disposed || this.session.trackId === null) return;
    this.audioElement.pause();
    this.update({
      ...this.session,
      state: "paused",
      currentTimeSeconds: validTime(this.audioElement.currentTime),
    });
  }

  seek(seconds: number): boolean {
    const duration = this.session.durationSeconds;
    if (
      this.disposed ||
      this.session.trackId === null ||
      duration === null ||
      !Number.isFinite(seconds)
    ) {
      return false;
    }
    const currentTimeSeconds = Math.min(duration, Math.max(0, seconds));
    try {
      this.audioElement.currentTime = currentTimeSeconds;
    } catch {
      return false;
    }
    this.update({ ...this.session, currentTimeSeconds });
    return true;
  }

  setVolume(volume: number): boolean {
    if (this.disposed || !Number.isFinite(volume)) return false;
    const clamped = Math.min(1, Math.max(0, volume));
    this.graph.gain.gain.value = clamped;
    this.update({ ...this.session, volume: clamped });
    return true;
  }

  removeTrack(trackId: TrackId): void {
    if (this.session.trackId !== trackId) return;
    this.releaseActiveTrack();
    this.update(initialSession());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseActiveTrack();
    for (const [type, handler] of this.eventHandlers) {
      this.audioElement.removeEventListener(type, handler);
    }
    this.graph.dispose();
    void this.graph.context.close().catch(() => undefined);
    this.listeners.clear();
  }

  private readonly onTimeUpdate: EventListener = () => {
    this.update({ ...this.session, currentTimeSeconds: validTime(this.audioElement.currentTime) });
  };

  private readonly onDurationChange: EventListener = () => {
    this.update({
      ...this.session,
      currentTimeSeconds: validTime(this.audioElement.currentTime),
      durationSeconds: validDuration(this.audioElement.duration),
    });
  };

  private readonly onEnded: EventListener = () => {
    const duration = validDuration(this.audioElement.duration);
    this.update({
      ...this.session,
      state: "ended",
      currentTimeSeconds: duration ?? validTime(this.audioElement.currentTime),
      durationSeconds: duration,
    });
  };

  private readonly onMediaError: EventListener = () => {
    this.update({ ...this.session, state: "error" });
  };

  private releaseActiveTrack(): void {
    this.audioElement.pause();
    this.audioElement.removeAttribute("src");
    this.audioElement.load();
    if (this.activeUrl !== null) {
      this.runtime.revokeObjectUrl(this.activeUrl);
      this.activeUrl = null;
    }
  }

  private update(session: PlaybackSession): void {
    this.session = session;
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
