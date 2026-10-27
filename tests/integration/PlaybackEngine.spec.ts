import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioLibrary } from "../../src/audio/AudioLibrary";
import {
  PlaybackEngine,
  type PlaybackRuntime,
} from "../../src/audio/PlaybackEngine";

class FakeMediaElement extends EventTarget {
  src = "";
  currentTime = 0;
  duration = 12;
  volume = 1;
  paused = true;
  load = vi.fn();
  play = vi.fn(async () => {
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
}

function connectableNode<T extends object>(node: T): T & { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> } {
  return Object.assign(node, { connect: vi.fn(), disconnect: vi.fn() });
}

function makeRuntime(media: FakeMediaElement): PlaybackRuntime & {
  context: AudioContext;
  revoked: string[];
  gain: GainNode;
} {
  const source = connectableNode({});
  const analyser = connectableNode({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  });
  const gain = connectableNode({ gain: { value: 1 } });
  const context = {
    state: "suspended",
    destination: {},
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createMediaElementSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => gain),
  } as unknown as AudioContext;
  const revoked: string[] = [];

  return {
    createAudioElement: () => media as unknown as HTMLAudioElement,
    createAudioContext: () => context,
    createObjectUrl: vi.fn((file: File) => `blob:watcher/${file.name}`),
    revokeObjectUrl: vi.fn((url: string) => revoked.push(url)),
    context,
    revoked,
    gain: gain as unknown as GainNode,
  };
}

function makeTrack(name = "tone.wav") {
  return new AudioLibrary(() => "track-1").importFiles([
    new File(["audio"], name, { type: "audio/wav" }),
  ])[0]!;
}

describe("PlaybackEngine", () => {
  let media: FakeMediaElement;
  let runtime: ReturnType<typeof makeRuntime>;
  let engine: PlaybackEngine;

  beforeEach(() => {
    media = new FakeMediaElement();
    runtime = makeRuntime(media);
    engine = new PlaybackEngine(runtime);
  });

  it("plays and pauses the active track", async () => {
    engine.loadTrack(makeTrack());

    await expect(engine.play()).resolves.toBe(true);
    expect(engine.getSnapshot().state).toBe("playing");
    engine.pause();
    expect(engine.getSnapshot().state).toBe("paused");
  });

  it("seeks only when a finite duration is known", () => {
    engine.loadTrack(makeTrack());
    media.dispatchEvent(new Event("loadedmetadata"));
    media.currentTime = 0;

    expect(engine.seek(5)).toBe(true);
    expect(media.currentTime).toBe(5);

    media.duration = Number.POSITIVE_INFINITY;
    media.dispatchEvent(new Event("durationchange"));
    expect(engine.getSnapshot().durationSeconds).toBeNull();
    expect(engine.seek(3)).toBe(false);
  });

  it("clamps volume and applies it to the gain node", () => {
    expect(engine.setVolume(0.4)).toBe(true);
    expect(runtime.gain.gain.value).toBe(0.4);
    expect(engine.setVolume(4)).toBe(true);
    expect(runtime.gain.gain.value).toBe(1);
    expect(engine.setVolume(Number.NaN)).toBe(false);
  });

  it("enters ended state and clears stale progress when playback ends", () => {
    engine.loadTrack(makeTrack());
    media.currentTime = 12;
    media.dispatchEvent(new Event("ended"));

    expect(engine.getSnapshot()).toMatchObject({
      state: "ended",
      currentTimeSeconds: 12,
      durationSeconds: 12,
    });
  });

  it("represents unknown duration without NaN or infinity", () => {
    media.duration = Number.NaN;
    engine.loadTrack(makeTrack());

    expect(engine.getSnapshot().durationSeconds).toBeNull();
    expect(Number.isFinite(engine.getSnapshot().currentTimeSeconds)).toBe(true);
  });

  it("reports a rejected play request without throwing", async () => {
    engine.loadTrack(makeTrack());
    media.play.mockRejectedValueOnce(new Error("gesture required"));

    await expect(engine.play()).resolves.toBe(false);
    expect(engine.getSnapshot().state).toBe("error");
  });

  it("reports browser decode errors as an application error state", () => {
    engine.loadTrack(makeTrack());
    media.dispatchEvent(new Event("error"));

    expect(engine.getSnapshot().state).toBe("error");
  });

  it("stops active playback and releases the object URL when removed", () => {
    const track = makeTrack();
    engine.loadTrack(track);
    media.paused = false;

    engine.removeTrack(track.id);

    expect(media.pause).toHaveBeenCalled();
    expect(runtime.revoked).toEqual(["blob:watcher/tone.wav"]);
    expect(engine.getSnapshot()).toMatchObject({
      trackId: null,
      state: "empty",
      durationSeconds: null,
    });
  });

  it("releases the previous URL on track switch and the active URL on dispose", () => {
    engine.loadTrack(makeTrack("first.wav"));
    engine.loadTrack(makeTrack("second.wav"));
    expect(runtime.revoked).toEqual(["blob:watcher/first.wav"]);

    engine.dispose();
    expect(runtime.revoked).toEqual([
      "blob:watcher/first.wav",
      "blob:watcher/second.wav",
    ]);
    expect(runtime.context.close).toHaveBeenCalled();
  });
});
