/** Reusable analyser output for one render frame; never retain beyond a frame. */
export interface AudioFeatures {
  /** Normalized time-domain samples in the range [-1, 1]. */
  readonly timeDomain: Float32Array;
  /** Frequency magnitudes in the range [0, 255]. */
  readonly frequency: Uint8Array;
  readonly sampleRateHz: number;
  readonly fftSize: number;
  /** Monotonic timestamp captured for the current analysis frame. */
  readonly capturedAt: number;
}
