import type { AudioFeatures } from "../../src/domain/audioFeatures";
import type { VisualMode } from "../../src/domain/models";
import { CanvasRenderer } from "../../src/visual/CanvasRenderer";

const SOURCE_SAMPLE_RATE = 44_100;
const EVENT_INTERVAL_SECONDS = 0.5;
const FFT_SIZE = 8_192;
const WINDOW_SECONDS = 0.1;
const MAX_CLOCK_RESIDUAL_MS = 5;

export interface SampleIndexedEvent {
  readonly ordinal: number;
  readonly sampleIndex: number;
  readonly offsetSeconds: number;
  readonly frequencyHz: 220 | 880;
}

export interface ClockPair {
  readonly audioTimeSeconds: number;
  readonly monotonicTimeMs: number;
}

export interface ClockCalibration {
  readonly valid: boolean;
  readonly slopeMsPerSecond: number;
  readonly interceptMs: number;
  readonly maximumResidualMs: number;
}

export interface RasterMetrics {
  readonly foregroundPixels: number;
  readonly meanHue: number | null;
  readonly waveformFrequencyHz: number | null;
  readonly targetBarHeight: number;
  readonly previousBarHeight: number;
  readonly targetRadialLength: number;
  readonly previousRadialLength: number;
  readonly pixelHash: string;
  readonly readbackDurationMs: number;
}

export interface ProbeEventEvidence {
  readonly ordinal: number;
  readonly sampleIndex: number;
  readonly expectedFrequencyHz: number;
  readonly sourceAudioTimeSeconds: number;
  readonly sourceMonotonicTimeMs: number | null;
  readonly status: "qualified" | "signature-only" | "pending";
  readonly firstQualifyingFrameSequence: number | null;
  readonly firstQualifyingDrawCompletedAt: number | null;
  readonly latencyMs: number | null;
  readonly signatureValue: number | null;
  readonly signatureMatches: boolean;
  readonly rasterOracleMatches: boolean;
  readonly raster: RasterMetrics | null;
}

export interface ProbeFrameEvidence {
  readonly sequence: number;
  readonly drawCompletedAt: number;
  readonly mode: VisualMode;
  readonly eventOrdinal: number | null;
  readonly signatureValue: number | null;
  readonly signatureMatches: boolean;
  readonly rasterOracleMatches: boolean | null;
  readonly readbackDurationMs: number;
}

interface PendingProbeFrame {
  readonly sequence: number;
  readonly drawCompletedAt: number;
  readonly signatureValue: number | null;
  readonly raster: RasterMetrics | null;
  readonly commandMatches: boolean;
  readonly rasterMatches: boolean | null;
}

export interface VisualResponseEvidence {
  readonly mode: VisualMode;
  readonly sampleRateHz: number;
  readonly fftSize: number;
  readonly smoothingTimeConstant: number;
  readonly analysisWindowMs: number;
  readonly warmupSeconds: number;
  readonly clockPairs: readonly ClockPair[];
  readonly clockCalibration: ClockCalibration;
  readonly frames: readonly ProbeFrameEvidence[];
  readonly events: readonly ProbeEventEvidence[];
  readonly diagnosticOverhead: {
    readonly rasterReadbackEnabled: boolean;
    readonly p50ReadbackMs: number | null;
    readonly p95ReadbackMs: number | null;
    readonly maximumReadbackMs: number | null;
  };
  readonly oracleStatus: "requires-review";
  readonly limitation: string;
}

export interface DiagnosticOverheadComparison {
  readonly mode: VisualMode;
  readonly withRasterReadback: VisualResponseEvidence;
  readonly withoutRasterReadback: VisualResponseEvidence;
  readonly readbackP50Ms: number | null;
  readonly readbackP95Ms: number | null;
  readonly readbackMaximumMs: number | null;
  readonly framesPerSecondWithReadback: number;
  readonly framesPerSecondWithoutReadback: number;
  readonly frameRateDifference: number;
  readonly latencyDifferenceMs: readonly number[];
  readonly status: "measured" | "pending";
}

export function createSampleIndexedEvents(
  sampleRate: number,
  count: number,
): SampleIndexedEvent[] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isInteger(count) || count < 0) {
    throw new RangeError("Sample rate and event count must be positive finite values.");
  }
  return Array.from({ length: count }, (_, index) => {
    const ordinal = index + 1;
    return {
      ordinal,
      sampleIndex: Math.round(sampleRate * EVENT_INTERVAL_SECONDS * ordinal),
      offsetSeconds: EVENT_INTERVAL_SECONDS * ordinal,
      frequencyHz: ordinal % 2 === 1 ? 880 : 220,
    };
  });
}

export function validateClockCalibration(
  pairs: readonly ClockPair[],
  maximumResidualMs = MAX_CLOCK_RESIDUAL_MS,
): ClockCalibration {
  if (pairs.length < 2 || pairs.some(({ audioTimeSeconds, monotonicTimeMs }) =>
    !Number.isFinite(audioTimeSeconds) || !Number.isFinite(monotonicTimeMs))) {
    return {
      valid: false,
      slopeMsPerSecond: Number.NaN,
      interceptMs: Number.NaN,
      maximumResidualMs: Number.POSITIVE_INFINITY,
    };
  }
  const meanAudio = pairs.reduce((sum, pair) => sum + pair.audioTimeSeconds, 0) / pairs.length;
  const meanMonotonic = pairs.reduce((sum, pair) => sum + pair.monotonicTimeMs, 0) / pairs.length;
  let covariance = 0;
  let variance = 0;
  for (const pair of pairs) {
    const x = pair.audioTimeSeconds - meanAudio;
    covariance += x * (pair.monotonicTimeMs - meanMonotonic);
    variance += x * x;
  }
  if (variance === 0) {
    return {
      valid: false,
      slopeMsPerSecond: Number.NaN,
      interceptMs: Number.NaN,
      maximumResidualMs: Number.POSITIVE_INFINITY,
    };
  }
  const slopeMsPerSecond = covariance / variance;
  const interceptMs = meanMonotonic - slopeMsPerSecond * meanAudio;
  const maximumResidual = Math.max(...pairs.map(({ audioTimeSeconds, monotonicTimeMs }) =>
    Math.abs(monotonicTimeMs - (interceptMs + slopeMsPerSecond * audioTimeSeconds))));
  return {
    valid: maximumResidual <= maximumResidualMs,
    slopeMsPerSecond,
    interceptMs,
    maximumResidualMs: maximumResidual,
  };
}

export function isProbeSourceIsolated(graph: {
  probeSourceConnected: boolean;
  mediaElementSourceConnected: boolean;
  unrelatedSourceCount: number;
}): boolean {
  return graph.probeSourceConnected &&
    !graph.mediaElementSourceConnected &&
    graph.unrelatedSourceCount === 0;
}

export function confirmRasterResponse(
  first: { commandSignatureMatches: boolean; rasterOracleMatches: boolean },
  second: { commandSignatureMatches: boolean; rasterOracleMatches: boolean },
): { confirmed: boolean; firstQualifyingFrame: 1 | 2 | null } {
  const firstPass = first.commandSignatureMatches && first.rasterOracleMatches;
  const secondPass = second.commandSignatureMatches && second.rasterOracleMatches;
  return {
    confirmed: firstPass && secondPass,
    firstQualifyingFrame: firstPass && secondPass ? 1 : null,
  };
}

/** JSON-only local evidence serialization; no network or persistence sink. */
export function serializeLocalEvidence(evidence: unknown): string {
  const serialized = JSON.stringify(evidence, null, 2);
  if (serialized === undefined) throw new TypeError("Evidence is not JSON serializable.");
  return serialized;
}

export function createLocalEvidenceBlob(evidence: unknown): Blob {
  return new Blob([serializeLocalEvidence(evidence)], { type: "application/json" });
}

function createBuffer(
  context: AudioContext,
  seconds: number,
  signal: (timeSeconds: number) => number,
): AudioBuffer {
  const frames = Math.ceil(SOURCE_SAMPLE_RATE * seconds);
  const buffer = context.createBuffer(2, frames, SOURCE_SAMPLE_RATE);
  for (let channel = 0; channel < 2; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = signal(index / SOURCE_SAMPLE_RATE);
    }
  }
  return buffer;
}

function createSweep(context: AudioContext): AudioBuffer {
  const amplitude = 10 ** (-12 / 20);
  return createBuffer(context, 10, (time) =>
    amplitude * Math.sin(2 * Math.PI * (110 * time + 38.5 * time * time)));
}

function createDiagnosticSignal(context: AudioContext): AudioBuffer {
  const amplitude = 10 ** (-12 / 20);
  return createBuffer(context, 10.5, (time) => {
    const segment = Math.min(20, Math.floor(time / EVENT_INTERVAL_SECONDS));
    const segmentStart = segment * EVENT_INTERVAL_SECONDS;
    const frequency = segment % 2 === 0 ? 220 : 880;
    return amplitude * Math.sin(2 * Math.PI * frequency * (time - segmentStart));
  });
}

function playBuffer(context: AudioContext, analyser: AnalyserNode, buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    source.addEventListener("ended", () => {
      source.disconnect();
      resolve();
    }, { once: true });
    try {
      source.start(context.currentTime + 0.05);
    } catch (error) {
      source.disconnect();
      reject(error);
    }
  });
}

function dominantFrequencyHz(features: AudioFeatures): number {
  let strongestBin = 1;
  for (let bin = 2; bin < features.frequency.length; bin += 1) {
    if (features.frequency[bin]! > features.frequency[strongestBin]!) strongestBin = bin;
  }
  return strongestBin * features.sampleRateHz / features.fftSize;
}

function waveformFrequencyHz(features: AudioFeatures): number {
  const sampleCount = Math.min(
    features.timeDomain.length,
    Math.floor(features.sampleRateHz * WINDOW_SECONDS),
  );
  if (sampleCount < 2) return 0;
  const start = features.timeDomain.length - sampleCount;
  let crossings = 0;
  let previous = features.timeDomain[start]!;
  for (let index = start + 1; index < features.timeDomain.length; index += 1) {
    const current = features.timeDomain[index]!;
    if ((previous <= 0 && current > 0) || (previous >= 0 && current < 0)) crossings += 1;
    previous = current;
  }
  return crossings / (2 * (sampleCount / features.sampleRateHz));
}

function frequencyPeak(features: AudioFeatures, expectedHz: number): number {
  const centerBin = Math.round(expectedHz * features.fftSize / features.sampleRateHz);
  const toleranceBins = Math.max(1, Math.ceil(centerBin * 0.1));
  let peak = 0;
  for (let bin = Math.max(1, centerBin - toleranceBins);
    bin <= Math.min(features.frequency.length - 1, centerBin + toleranceBins);
    bin += 1) {
    peak = Math.max(peak, features.frequency[bin]!);
  }
  return peak;
}

function spectralCentroidHz(features: AudioFeatures): number {
  let total = 0;
  let weighted = 0;
  for (let bin = 1; bin < features.frequency.length; bin += 1) {
    const magnitude = features.frequency[bin]!;
    total += magnitude;
    weighted += magnitude * bin * features.sampleRateHz / features.fftSize;
  }
  return total === 0 ? 0 : weighted / total;
}

function signatureMetric(mode: VisualMode, features: AudioFeatures): number {
  switch (mode) {
    case "waveform": return waveformFrequencyHz(features);
    case "spectrum": return frequencyPeak(features, dominantFrequencyHz(features));
    case "radial": return radialSignatureRadius(features, dominantFrequencyHz(features));
    case "particle": return spectralCentroidHz(features);
    case "psychedelic": return psychedelicHue(dominantFrequencyHz(features));
  }
}

function radialSignatureRadius(features: AudioFeatures, frequencyHz: number): number {
  const peak = frequencyPeak(features, frequencyHz) / 255;
  const bandGain = frequencyHz < 250 ? 0.35 : frequencyHz < 2_000 ? 1.35 : 1.2;
  return 0.16 + Math.sqrt(peak) * 0.28 * bandGain;
}

function psychedelicHue(frequencyHz: number): number {
  return 205 + Math.min(1, Math.max(0, (frequencyHz - 220) / 660)) * 120;
}

function signatureMatches(mode: VisualMode, features: AudioFeatures, expectedHz: number, previousHz: number): boolean {
  if (mode === "particle") {
    const current = spectralCentroidHz(features);
    return current > 0 && Math.abs(current - previousHz) >= previousHz * 0.25 &&
      Math.abs(current - expectedHz) <= expectedHz * 0.5;
  }
  if (mode === "spectrum") {
    const nextPeak = frequencyPeak(features, expectedHz);
    const oldPeak = frequencyPeak(features, previousHz);
    return nextPeak >= oldPeak * 1.5 && nextPeak > 0;
  }
  if (mode === "radial") {
    const nextRadius = radialSignatureRadius(features, expectedHz);
    const oldRadius = radialSignatureRadius(features, previousHz);
    return nextRadius >= oldRadius * 1.25;
  }
  if (mode === "psychedelic") {
    const measuredHue = psychedelicHue(dominantFrequencyHz(features));
    return circularDistanceDegrees(measuredHue, psychedelicHue(expectedHz)) <= 18 &&
      circularDistanceDegrees(psychedelicHue(expectedHz), psychedelicHue(previousHz)) >= 30;
  }
  const measured = waveformFrequencyHz(features);
  return Math.abs(measured - expectedHz) <= expectedHz * 0.15;
}

function rgbToHue(red: number, green: number, blue: number): number {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  if (max === r) return ((g - b) / delta % 6) * 60;
  if (max === g) return ((b - r) / delta + 2) * 60;
  return ((r - g) / delta + 4) * 60;
}

function pixelIsForeground(data: Uint8ClampedArray, offset: number): boolean {
  return Math.max(data[offset]!, data[offset + 1]!, data[offset + 2]!) > 60;
}

function pixelAt(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return pixelIsForeground(data, (Math.floor(y) * width + Math.floor(x)) * 4);
}

function readRasterMetrics(
  canvas: HTMLCanvasElement,
  mode: VisualMode,
  features: AudioFeatures,
  currentHz: number,
  previousHz: number,
): RasterMetrics {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null || canvas.width === 0 || canvas.height === 0) {
    return {
      foregroundPixels: 0,
      meanHue: null,
      waveformFrequencyHz: null,
      targetBarHeight: 0,
      previousBarHeight: 0,
      targetRadialLength: 0,
      previousRadialLength: 0,
      pixelHash: "empty",
      readbackDurationMs: 0,
    };
  }
  const startedAt = performance.now();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  const pixelCount = canvas.width * canvas.height;
  let foregroundPixels = 0;
  let hash = 2_166_136_261;
  let hueX = 0;
  let hueY = 0;
  let hueSamples = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 16) {
    const offset = pixel * 4;
    if (pixelIsForeground(data, offset)) {
      foregroundPixels += 16;
      const hueRadians = rgbToHue(data[offset]!, data[offset + 1]!, data[offset + 2]!) * Math.PI / 180;
      hueX += Math.cos(hueRadians);
      hueY += Math.sin(hueRadians);
      hueSamples += 1;
    }
    hash = Math.imul(hash ^ data[offset]!, 16_777_619);
    hash = Math.imul(hash ^ data[offset + 1]!, 16_777_619);
    hash = Math.imul(hash ^ data[offset + 2]!, 16_777_619);
  }
  const meanHue = hueSamples === 0
    ? null
    : (Math.atan2(hueY, hueX) * 180 / Math.PI + 360) % 360;
  const waveformHz = mode === "waveform"
    ? estimateRasterWaveform(data, canvas.width, canvas.height, features)
    : null;
  const targetBarHeight = mode === "spectrum"
    ? spectrumBarHeight(data, canvas.width, canvas.height, currentHz, features)
    : 0;
  const previousBarHeight = mode === "spectrum"
    ? spectrumBarHeight(data, canvas.width, canvas.height, previousHz, features)
    : 0;
  const targetRadialLength = mode === "radial"
    ? radialSpokeLength(data, canvas.width, canvas.height, currentHz, features)
    : 0;
  const previousRadialLength = mode === "radial"
    ? radialSpokeLength(data, canvas.width, canvas.height, previousHz, features)
    : 0;
  return {
    foregroundPixels,
    meanHue,
    waveformFrequencyHz: waveformHz,
    targetBarHeight,
    previousBarHeight,
    targetRadialLength,
    previousRadialLength,
    pixelHash: (hash >>> 0).toString(16).padStart(8, "0"),
    readbackDurationMs: performance.now() - startedAt,
  };
}

function estimateRasterWaveform(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  features: AudioFeatures,
): number {
  const fullWindowSeconds = features.fftSize / features.sampleRateHz;
  const visibleFraction = Math.min(1, WINDOW_SECONDS / fullWindowSeconds);
  const startX = Math.floor(width * (1 - visibleFraction));
  let lastSign = 0;
  let crossings = 0;
  for (let x = startX; x < width; x += 2) {
    let bestY = -1;
    let bestBrightness = 60;
    const center = Math.floor(height / 2);
    const radius = Math.floor(height * 0.4);
    for (let y = Math.max(0, center - radius); y < Math.min(height, center + radius); y += 1) {
      const offset = (y * width + x) * 4;
      const brightness = Math.max(data[offset]!, data[offset + 1]!, data[offset + 2]!);
      if (brightness > bestBrightness) {
        bestBrightness = brightness;
        bestY = y;
      }
    }
    if (bestY < 0) continue;
    const sign = bestY < center ? -1 : 1;
    if (lastSign !== 0 && sign !== lastSign) crossings += 1;
    lastSign = sign;
  }
  return crossings / (2 * WINDOW_SECONDS);
}

function spectrumBarHeight(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  frequencyHz: number,
  features: AudioFeatures,
): number {
  const count = Math.min(96, Math.max(24, Math.floor(width / 9)));
  const gap = Math.max(1, width * 0.006);
  const barWidth = Math.max(1, (width - (count - 1) * gap) / count);
  const bin = Math.round(frequencyHz * features.fftSize / features.sampleRateHz);
  const position = Math.sqrt(Math.max(0, bin / features.frequency.length));
  const index = Math.min(count - 1, Math.floor(position * count));
  const x = Math.floor(index * (barWidth + gap) + barWidth / 2);
  let highest = height;
  for (let y = 0; y < height; y += 1) {
    if (pixelAt(data, width, height, x, y)) {
      highest = y;
      break;
    }
  }
  return height - highest;
}

function radialSpokeLength(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  frequencyHz: number,
  features: AudioFeatures,
): number {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.16;
  const maxRadius = Math.min(width, height) * 0.44;
  const spokes = Math.min(180, Math.max(96, Math.floor(width / 3)));
  const lowestHz = 30;
  const highestHz = features.sampleRateHz / 2;
  const normalized = Math.min(1, Math.max(0,
    Math.log(frequencyHz / lowestHz) / Math.log(highestHz / lowestHz)));
  const index = Math.min(spokes - 1, Math.round(normalized * spokes));
  const angle = index / spokes * Math.PI * 2;
  let lastVisible = 0;
  for (let radius = baseRadius; radius <= maxRadius; radius += 1) {
    const x = Math.round(centerX + Math.cos(angle) * radius);
    const y = Math.round(centerY + Math.sin(angle) * radius);
    if (pixelAt(data, width, height, x, y)) lastVisible = radius - baseRadius;
  }
  return lastVisible;
}

function circularDistanceDegrees(first: number, second: number): number {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

function rasterOracleMatches(
  mode: VisualMode,
  raster: RasterMetrics,
  expectedHz: number,
  previousHz: number,
): boolean {
  if (raster.foregroundPixels <= 0) return false;
  if (mode === "waveform") {
    return raster.waveformFrequencyHz !== null &&
      Math.abs(raster.waveformFrequencyHz - expectedHz) <= expectedHz * 0.15;
  }
  if (mode === "spectrum") {
    return raster.targetBarHeight > 0 &&
      raster.targetBarHeight >= Math.max(1, raster.previousBarHeight * 1.5);
  }
  if (mode === "radial") {
    return raster.targetRadialLength > 0 &&
      raster.targetRadialLength >= Math.max(1, raster.previousRadialLength * 1.25);
  }
  if (raster.meanHue === null) return false;
  const targetHue = mode === "psychedelic"
    ? psychedelicHue(expectedHz)
    : 185 + Math.min(1, Math.max(0, (expectedHz - 220) / 660)) * 120 * 1.7;
  const previousHue = mode === "psychedelic"
    ? psychedelicHue(previousHz)
    : 185 + Math.min(1, Math.max(0, (previousHz - 220) / 660)) * 120 * 1.7;
  return circularDistanceDegrees(raster.meanHue, targetHue) <= 75 &&
    circularDistanceDegrees(targetHue, previousHue) >= 30;
}

function percentile(values: readonly number[], quantile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1)]!;
}

export interface VisualResponseProbeOptions {
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;
  readonly renderer: CanvasRenderer;
  readonly canvas: HTMLCanvasElement;
  readonly disconnectMediaSource: () => void;
  readonly mediaSourceConnected: () => boolean;
  readonly reconnectMediaSource?: () => void;
  readonly muteOutput: () => void;
  readonly restoreOutput: () => void;
}

/** Test-only end-to-end source isolation, raster oracle, timing, and local evidence probe. */
export class VisualResponseProbe {
  private rasterReadbackEnabled = true;

  constructor(private readonly options: VisualResponseProbeOptions) {}

  setRasterReadbackEnabled(enabled: boolean): void {
    this.rasterReadbackEnabled = enabled;
  }

  async runModeAB(mode: VisualMode): Promise<DiagnosticOverheadComparison> {
    this.setRasterReadbackEnabled(true);
    const withRasterReadback = await this.runMode(mode);
    this.setRasterReadbackEnabled(false);
    let withoutRasterReadback: VisualResponseEvidence | null = null;
    try {
      withoutRasterReadback = await this.runMode(mode);
    } finally {
      this.setRasterReadbackEnabled(true);
    }
    if (withoutRasterReadback === null) throw new Error("SC-013 A/B control run did not produce evidence.");
    const elapsedSeconds = (evidence: VisualResponseEvidence): number => {
      const first = evidence.frames[0]?.drawCompletedAt;
      const last = evidence.frames.at(-1)?.drawCompletedAt;
      return first === undefined || last === undefined || last <= first
        ? 0
        : (last - first) / 1_000;
    };
    const rate = (evidence: VisualResponseEvidence): number => {
      const elapsed = elapsedSeconds(evidence);
      return elapsed === 0 ? 0 : evidence.frames.length / elapsed;
    };
    const withRate = rate(withRasterReadback);
    const withoutRate = rate(withoutRasterReadback);
    const latencyDifferenceMs = withRasterReadback.events.flatMap((event) => {
      const control = withoutRasterReadback.events.find(({ ordinal }) => ordinal === event.ordinal);
      return event.latencyMs !== null && control?.latencyMs !== null && control?.latencyMs !== undefined
        ? [event.latencyMs - control.latencyMs]
        : [];
    });
    return {
      mode,
      withRasterReadback,
      withoutRasterReadback,
      readbackP50Ms: withRasterReadback.diagnosticOverhead.p50ReadbackMs,
      readbackP95Ms: withRasterReadback.diagnosticOverhead.p95ReadbackMs,
      readbackMaximumMs: withRasterReadback.diagnosticOverhead.maximumReadbackMs,
      framesPerSecondWithReadback: withRate,
      framesPerSecondWithoutReadback: withoutRate,
      frameRateDifference: withRate - withoutRate,
      latencyDifferenceMs,
      status: withRasterReadback.frames.length > 0 && withoutRasterReadback.frames.length > 0
        ? "measured"
        : "pending",
    };
  }

  async runMode(mode: VisualMode): Promise<VisualResponseEvidence> {
    const {
      context,
      analyser,
      renderer,
      canvas,
      disconnectMediaSource,
      mediaSourceConnected,
      reconnectMediaSource,
      muteOutput,
      restoreOutput,
    } = this.options;
    const previousFftSize = analyser.fftSize;
    const previousSmoothing = analyser.smoothingTimeConstant;
    const clockPairs: ClockPair[] = [];
    const frameRows: ProbeFrameEvidence[] = [];
    const eventRows = new Map<number, ProbeEventEvidence>();
    const rasterDurations: number[] = [];
    const pendingFrames = new Map<number, PendingProbeFrame>();
    const events = createSampleIndexedEvents(SOURCE_SAMPLE_RATE, 20);
    let sourceStartTime = 0;
    let lastEventOrdinal: number | null = null;
    let contextInvalid = false;
    let sourceEnded = false;
    let clockTimer: number | null = null;
    let diagnosticSource: AudioBufferSourceNode | null = null;
    let outputMuted = false;
    let cleanupDone = false;

    if (context.state === "suspended") await context.resume();
    if (context.state !== "running") throw new Error(`AudioContext is ${context.state}; SC-013 requires a running context.`);
    if (context.sampleRate * WINDOW_SECONDS > FFT_SIZE) {
      throw new Error("SC-013 invalid: 8192 samples cannot represent the required 100 ms analysis window at this sample rate.");
    }
    const cleanup = (): void => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (clockTimer !== null) window.clearInterval(clockTimer);
      renderer.setDiagnosticObserver(null);
      renderer.stop();
      if (diagnosticSource !== null) {
        try { diagnosticSource.stop(); } catch { /* already ended */ }
        diagnosticSource.disconnect();
      }
      analyser.fftSize = previousFftSize;
      analyser.smoothingTimeConstant = previousSmoothing;
      reconnectMediaSource?.();
      if (outputMuted) restoreOutput();
    };

    disconnectMediaSource();
    if (mediaSourceConnected()) {
      reconnectMediaSource?.();
      throw new Error("SC-013 source isolation failed: media element source is still connected.");
    }
    try {
      muteOutput();
      outputMuted = true;
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0;
      renderer.setMode(mode);
      renderer.start(analyser);
    } catch (error) {
      cleanup();
      throw error;
    }

    const sampleClock = (): void => {
      clockPairs.push({ audioTimeSeconds: context.currentTime, monotonicTimeMs: performance.now() });
      if (clockPairs.length > 2_000) clockPairs.shift();
      if (context.state !== "running" || document.hidden) contextInvalid = true;
    };
    sampleClock();
    clockTimer = window.setInterval(sampleClock, 25);
    try {
      await playBuffer(context, analyser, createSweep(context));

      const diagnostic = createDiagnosticSignal(context);
      diagnosticSource = context.createBufferSource();
      diagnosticSource.buffer = diagnostic;
      diagnosticSource.connect(analyser);
      diagnosticSource.addEventListener("ended", () => { sourceEnded = true; }, { once: true });
      sourceStartTime = context.currentTime + 0.05;
      diagnosticSource.start(sourceStartTime);

    const getCurrentEvent = (audioTime: number): SampleIndexedEvent | null => {
      const offset = audioTime - sourceStartTime;
      if (offset < EVENT_INTERVAL_SECONDS) return null;
      const ordinal = Math.min(20, Math.floor(offset / EVENT_INTERVAL_SECONDS));
      return events[ordinal - 1] ?? null;
    };

      renderer.setDiagnosticObserver((observation) => {
      const activeEvent = getCurrentEvent(context.currentTime);
      const calibration = validateClockCalibration(clockPairs);
      const eventMonotonicTimeMs = activeEvent === null || !calibration.valid
        ? null
        : calibration.interceptMs + calibration.slopeMsPerSecond *
          (sourceStartTime + activeEvent.offsetSeconds);
      const previousHz = activeEvent === null || activeEvent.ordinal % 2 === 1 ? 220 : 880;
      const metric = activeEvent === null
        ? null
        : signatureMetric(mode, observation.features);
      const commandMatches = activeEvent !== null && signatureMatches(
        mode,
        observation.features,
        activeEvent.frequencyHz,
        previousHz,
      );
      const raster = activeEvent !== null && this.rasterReadbackEnabled
        ? readRasterMetrics(canvas, mode, observation.features, activeEvent.frequencyHz, previousHz)
        : null;
      if (raster !== null) rasterDurations.push(raster.readbackDurationMs);
      const rasterMatches = activeEvent !== null && raster !== null
        ? rasterOracleMatches(mode, raster, activeEvent.frequencyHz, previousHz)
        : null;
      frameRows.push({
        sequence: observation.sequence,
        drawCompletedAt: observation.drawCompletedAt,
        mode,
        eventOrdinal: activeEvent?.ordinal ?? null,
        signatureValue: metric,
        signatureMatches: commandMatches,
        rasterOracleMatches: rasterMatches,
        readbackDurationMs: raster?.readbackDurationMs ?? 0,
      });
      if (frameRows.length > 20_000) frameRows.shift();

      if (activeEvent !== null && activeEvent.ordinal !== lastEventOrdinal) {
        pendingFrames.delete(activeEvent.ordinal);
        lastEventOrdinal = activeEvent.ordinal;
      }
      if (activeEvent !== null && eventMonotonicTimeMs !== null &&
        commandMatches && (!this.rasterReadbackEnabled || rasterMatches === true)) {
        const first = pendingFrames.get(activeEvent.ordinal);
        if (first !== undefined && first.sequence + 1 === observation.sequence) {
          const existing = eventRows.get(activeEvent.ordinal);
          if (existing?.status !== "qualified") {
            const rasterConfirmed = this.rasterReadbackEnabled &&
              first.rasterMatches === true && rasterMatches === true;
            eventRows.set(activeEvent.ordinal, {
              ordinal: activeEvent.ordinal,
              sampleIndex: activeEvent.sampleIndex,
              expectedFrequencyHz: activeEvent.frequencyHz,
              sourceAudioTimeSeconds: sourceStartTime + activeEvent.offsetSeconds,
              sourceMonotonicTimeMs: eventMonotonicTimeMs,
              status: rasterConfirmed ? "qualified" : "signature-only",
              firstQualifyingFrameSequence: first.sequence,
              firstQualifyingDrawCompletedAt: first.drawCompletedAt,
              latencyMs: first.drawCompletedAt - eventMonotonicTimeMs,
              signatureValue: first.signatureValue,
              signatureMatches: first.commandMatches,
              rasterOracleMatches: rasterConfirmed,
              raster: first.raster,
            });
          }
        } else {
          pendingFrames.set(activeEvent.ordinal, {
            sequence: observation.sequence,
            drawCompletedAt: observation.drawCompletedAt,
            signatureValue: metric,
            raster,
            commandMatches,
            rasterMatches,
          });
        }
      } else if (activeEvent !== null) {
        pendingFrames.delete(activeEvent.ordinal);
      }
      });

      await new Promise<void>((resolve, reject) => {
        const endedTimer = window.setTimeout(() => {
          if (sourceEnded) resolve();
          else reject(new Error("SC-013 diagnostic source did not reach its end marker."));
        }, 12_000);
        diagnosticSource?.addEventListener("ended", () => {
          window.clearTimeout(endedTimer);
          resolve();
        }, { once: true });
      });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
    } finally {
      cleanup();
    }

    const calibration = validateClockCalibration(clockPairs);
    for (const event of events) {
      if (!eventRows.has(event.ordinal)) {
        const eventMonotonic = calibration.valid
          ? calibration.interceptMs + calibration.slopeMsPerSecond *
            (sourceStartTime + event.offsetSeconds)
          : null;
        eventRows.set(event.ordinal, {
          ordinal: event.ordinal,
          sampleIndex: event.sampleIndex,
          expectedFrequencyHz: event.frequencyHz,
          sourceAudioTimeSeconds: sourceStartTime + event.offsetSeconds,
          sourceMonotonicTimeMs: eventMonotonic,
          status: "pending",
          firstQualifyingFrameSequence: null,
          firstQualifyingDrawCompletedAt: null,
          latencyMs: null,
          signatureValue: null,
          signatureMatches: false,
          rasterOracleMatches: false,
          raster: null,
        });
      }
    }
    return {
      mode,
      sampleRateHz: context.sampleRate,
      fftSize: FFT_SIZE,
      smoothingTimeConstant: 0,
      analysisWindowMs: FFT_SIZE / context.sampleRate * 1_000,
      warmupSeconds: 10,
      clockPairs,
      clockCalibration: calibration,
      frames: frameRows,
      events: [...eventRows.values()].sort((a, b) => a.ordinal - b.ordinal),
      diagnosticOverhead: {
        rasterReadbackEnabled: this.rasterReadbackEnabled,
        p50ReadbackMs: percentile(rasterDurations, 0.5),
        p95ReadbackMs: percentile(rasterDurations, 0.95),
        maximumReadbackMs: rasterDurations.length === 0 ? null : Math.max(...rasterDurations),
      },
      oracleStatus: "requires-review",
      limitation: contextInvalid
        ? "Run invalid: AudioContext suspended or document hidden during measurement."
        : "Per-mode raster oracle has not been empirically reviewed; Web Audio does not expose arbitrary graph introspection, so source isolation is established by the probe-owned graph and media-source disconnection. The 250 ms target is not validated.",
    };
  }
}
