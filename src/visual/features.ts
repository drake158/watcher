import type { AudioFeatures } from "../domain/audioFeatures";
import type { FrequencyFocus } from "../domain/settings";

/** Fixed implementation bands; treble ends at the current Nyquist frequency. */
export const FREQUENCY_BAND_BOUNDARIES_HZ = Object.freeze({
  bass: [20, 250] as const,
  mid: [250, 2_000] as const,
  treble: [2_000, Number.POSITIVE_INFINITY] as const,
});

export interface FrequencyBandLevels {
  readonly bass: number;
  readonly mid: number;
  readonly treble: number;
}

export interface AudioFeatureSummary {
  readonly rms: number;
  readonly peak: number;
  readonly bands: FrequencyBandLevels;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Maps 0–100 to -12…+12 dB, with the approved midpoint 50 at unity gain. */
export function getSensitivityGain(sensitivity: number): number {
  const normalized = Math.min(100, Math.max(0, sensitivity));
  const decibels = ((normalized - 50) / 50) * 12;
  return 10 ** (decibels / 20);
}

/** Applies the sensitivity curve to a normalized feature without changing audio. */
export function applySensitivity(level: number, sensitivity: number): number {
  return clamp01(level * getSensitivityGain(sensitivity));
}

/** Computes average normalized magnitude per documented frequency band. */
export function extractFrequencyBands(
  features: Pick<AudioFeatures, "frequency" | "sampleRateHz" | "fftSize">,
): FrequencyBandLevels {
  const nyquist = features.sampleRateHz / 2;
  const bandEnergy: Record<keyof FrequencyBandLevels, number> = {
    bass: 0,
    mid: 0,
    treble: 0,
  };
  const bandBins: Record<keyof FrequencyBandLevels, number> = {
    bass: 0,
    mid: 0,
    treble: 0,
  };

  for (let index = 0; index < features.frequency.length; index += 1) {
    const frequencyHz = (index * features.sampleRateHz) / features.fftSize;
    let band: keyof FrequencyBandLevels | null = null;
    if (frequencyHz >= FREQUENCY_BAND_BOUNDARIES_HZ.bass[0] && frequencyHz < 250) {
      band = "bass";
    } else if (frequencyHz >= 250 && frequencyHz < 2_000) {
      band = "mid";
    } else if (frequencyHz >= 2_000 && frequencyHz <= nyquist) {
      band = "treble";
    }
    if (band !== null) {
      bandEnergy[band] += features.frequency[index]! / 255;
      bandBins[band] += 1;
    }
  }

  return {
    bass: bandBins.bass === 0 ? 0 : bandEnergy.bass / bandBins.bass,
    mid: bandBins.mid === 0 ? 0 : bandEnergy.mid / bandBins.mid,
    treble: bandBins.treble === 0 ? 0 : bandEnergy.treble / bandBins.treble,
  };
}

/** Balanced focus gives bass, mid, and treble equal weight. */
export function getFocusedFrequencyLevel(
  levels: FrequencyBandLevels,
  focus: FrequencyFocus,
): number {
  if (focus === "balanced") {
    return (levels.bass + levels.mid + levels.treble) / 3;
  }
  return levels[focus];
}

export function summarizeAudioFeatures(features: AudioFeatures): AudioFeatureSummary {
  let squareSum = 0;
  let peak = 0;
  for (const sample of features.timeDomain) {
    squareSum += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const rms = features.timeDomain.length === 0
    ? 0
    : Math.sqrt(squareSum / features.timeDomain.length);
  return { rms, peak, bands: extractFrequencyBands(features) };
}

/** Owns reusable analyser buffers; callers receive views valid for one frame. */
export class AudioFeatureSampler {
  private readonly timeBytes: Uint8Array<ArrayBuffer>;
  private readonly frequency: Uint8Array<ArrayBuffer>;
  private readonly timeDomain: Float32Array<ArrayBuffer>;

  constructor(private readonly analyser: AnalyserNode) {
    this.timeBytes = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    this.frequency = new Uint8Array(
      new ArrayBuffer(analyser.frequencyBinCount),
    );
    this.timeDomain = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
  }

  capture(capturedAt = performance.now()): AudioFeatures {
    this.analyser.getByteTimeDomainData(this.timeBytes);
    this.analyser.getByteFrequencyData(this.frequency);
    for (let index = 0; index < this.timeBytes.length; index += 1) {
      this.timeDomain[index] = (this.timeBytes[index]! - 128) / 128;
    }
    return {
      timeDomain: this.timeDomain,
      frequency: this.frequency,
      sampleRateHz: this.analyser.context.sampleRate,
      fftSize: this.analyser.fftSize,
      capturedAt,
    };
  }
}
