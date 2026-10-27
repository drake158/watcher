import type { AudioFeatures } from "../domain/audioFeatures";

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
