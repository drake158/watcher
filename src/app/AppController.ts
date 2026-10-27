import { AppView } from "../ui/AppView";
import { AudioLibrary } from "../audio/AudioLibrary";
import { PlaybackEngine } from "../audio/PlaybackEngine";
import { PlayerView } from "../ui/PlayerView";
import { TrackListView } from "../ui/TrackListView";
import { CanvasRenderer } from "../visual/CanvasRenderer";
import type { PlaybackSession, TrackId } from "../domain/models";

export class AppController {
  constructor(private readonly root: HTMLElement) {}

  mount(): void {
    new AppView(this.root).mount();
    const library = new AudioLibrary();
    const trackHost = this.root.querySelector<HTMLElement>("#track-list-slot");
    const controlsHost = this.root.querySelector<HTMLElement>(
      "#player-controls-slot",
    );
    const canvas = this.root.querySelector<HTMLCanvasElement>(
      "#visualizer-canvas",
    );
    if (trackHost === null || controlsHost === null || canvas === null) {
      throw new Error("WATCHER player shell is missing required regions.");
    }

    let engine: PlaybackEngine | null = null;
    let renderer: CanvasRenderer | null = null;
    let statusMessage = "Player is idle.";
    let lastSession: PlaybackSession | null = null;
    const renderTracks = (): void => {
      trackList.render(library.getEntries(), engine?.getSnapshot().trackId ?? null);
    };
    const renderPlayback = (session: PlaybackSession): void => {
      const active =
        session.trackId === null ? undefined : library.find(session.trackId);
      if (session.state === "error" && active !== undefined) {
        library.update(active.id, { state: "resource-error" });
        statusMessage = `${active.displayName} could not be played. Retry it or remove it from the list.`;
        renderTracks();
      } else if (session.state === "playing") {
        statusMessage = `Playing ${active?.displayName ?? "selected track"}.`;
      } else if (session.state === "paused") {
        statusMessage = `Paused ${active?.displayName ?? "track"}.`;
      } else if (session.state === "ended") {
        statusMessage = `${active?.displayName ?? "Track"} ended.`;
      } else if (session.state === "loading") {
        statusMessage = `Loading ${active?.displayName ?? "selected track"}.`;
      } else if (session.state === "empty") {
        statusMessage = library.getEntries().length === 0
          ? "Player is idle. Choose local audio to begin."
          : "No track loaded. Select a track to play.";
      }
      player.render(session, active?.displayName ?? null, statusMessage);

      const shouldAnimate = session.state === "playing";
      const wasAnimating = lastSession?.state === "playing";
      const changedTrack = lastSession?.trackId !== session.trackId;
      if (!shouldAnimate) renderer?.stop();
      else if (!wasAnimating || changedTrack) {
        renderer?.start(engine!.graph.analyser);
      }
      lastSession = session;
    };

    const trackList = new TrackListView(trackHost, {
      onFilesSelected: (files) => {
        const imported = library.importFiles(files);
        renderTracks();
        if (imported.length === 0) return;
        const invalid = imported.filter(
          ({ state }) => state === "unsupported" || state === "unreadable",
        );
        statusMessage = invalid.length > 0
          ? invalid.map((entry) =>
              `${entry.displayName}: ${entry.state === "unsupported" ? "unsupported file" : "invalid or unreadable audio"}. Remove it or choose another file.`
            ).join(" ")
          : `${imported.length} ${imported.length === 1 ? "track added" : "tracks added"}. Select a track to play.`;
        const snapshot = engine?.getSnapshot();
        if (snapshot !== undefined) {
          const active =
            snapshot.trackId === null
              ? undefined
              : library.find(snapshot.trackId);
          player.render(snapshot, active?.displayName ?? null, statusMessage);
        } else {
          const status = this.root.querySelector<HTMLElement>("#playback-status");
          if (status !== null) status.textContent = statusMessage;
        }
      },
      onSelectTrack: (id) => {
        if (engine === null) {
          statusMessage = "Audio processing is unavailable in this browser.";
          const status = this.root.querySelector<HTMLElement>("#playback-status");
          if (status !== null) status.textContent = statusMessage;
          return;
        }
        this.selectTrack(id, library, engine, renderTracks);
      },
      onRemoveTrack: (id) => {
        engine?.removeTrack(id);
        library.remove(id);
        renderTracks();
        if (engine !== null) renderPlayback(engine.getSnapshot());
      },
    });
    trackList.mount();

    const player = new PlayerView(controlsHost, {
      onTogglePlayback: () => {
        if (engine === null) {
          statusMessage = "Audio playback is unavailable in this browser.";
          return;
        }
        const session = engine.getSnapshot();
        if (session.state === "playing") engine.pause();
        else {
          if (session.state === "ended") engine.seek(0);
          void engine.play();
        }
      },
      onSeek: (seconds) => engine?.seek(seconds),
      onVolume: (volume) => engine?.setVolume(volume),
    });
    player.mount();
    renderer = new CanvasRenderer(canvas);

    try {
      engine = new PlaybackEngine();
      engine.subscribe(renderPlayback);
      let resourcesDisposed = false;
      const disposeResources = (): void => {
        if (resourcesDisposed) return;
        resourcesDisposed = true;
        renderer?.dispose();
        engine?.dispose();
      };
      window.addEventListener("pagehide", disposeResources, { once: true });
      window.addEventListener("beforeunload", disposeResources, { once: true });
    } catch {
      statusMessage = "Audio playback is unavailable in this browser.";
      player.render(
        {
          trackId: null,
          state: "error",
          currentTimeSeconds: 0,
          durationSeconds: null,
          volume: 1,
        },
        null,
        statusMessage,
      );
    }

    renderTracks();
  }

  private selectTrack(
    id: TrackId,
    library: AudioLibrary,
    engine: PlaybackEngine | null,
    renderTracks: () => void,
  ): void {
    if (engine === null) return;
    const track = library.find(id);
    if (track === undefined) return;
    const previousId = engine.getSnapshot().trackId;
    if (previousId !== null && previousId !== id) {
      library.update(previousId, { state: "ready", objectUrl: null });
    }
    library.update(id, { state: "active" });
    const loaded = engine.loadTrack(library.find(id)!);
    if (loaded) {
      library.update(id, { state: "active", objectUrl: engine.getActiveObjectUrl() });
    } else {
      library.update(id, { state: "resource-error", objectUrl: null });
    }
    renderTracks();
  }
}
