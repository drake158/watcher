import { describe, expect, it } from "vitest";

interface ProbeModule {
  createSampleIndexedEvents(sampleRate: number, count: number): Array<{
    sampleIndex: number;
    offsetSeconds: number;
  }>;
  validateClockCalibration(
    pairs: Array<{ audioTimeSeconds: number; monotonicTimeMs: number }>,
    maximumResidualMs: number,
  ): { valid: boolean; maximumResidualMs: number };
  isProbeSourceIsolated(graph: {
    probeSourceConnected: boolean;
    mediaElementSourceConnected: boolean;
    unrelatedSourceCount: number;
  }): boolean;
  confirmRasterResponse(
    first: { commandSignatureMatches: boolean; rasterOracleMatches: boolean },
    second: { commandSignatureMatches: boolean; rasterOracleMatches: boolean },
  ): { confirmed: boolean; firstQualifyingFrame: 1 | 2 | null };
  serializeLocalEvidence(evidence: unknown): string;
}

const loadProbe = async (): Promise<ProbeModule> =>
  (await import("../../tests/support/VisualResponseProbe")) as ProbeModule;

describe("SC-013 visual response probe contract", () => {
  it("creates 20 changes at 22,050-sample intervals for 44.1 kHz input", async () => {
    const events = (await loadProbe()).createSampleIndexedEvents(44_100, 20);
    expect(events).toHaveLength(20);
    expect(events.map(({ sampleIndex }) => sampleIndex)).toEqual(
      Array.from({ length: 20 }, (_, index) => 22_050 * (index + 1)),
    );
    expect(events.map(({ offsetSeconds }) => offsetSeconds)).toEqual(
      Array.from({ length: 20 }, (_, index) => (index + 1) / 2),
    );
  });

  it("rejects clock calibration with residual above 5 ms", async () => {
    const result = (await loadProbe()).validateClockCalibration(
      [
        { audioTimeSeconds: 0, monotonicTimeMs: 1_000 },
        { audioTimeSeconds: 1, monotonicTimeMs: 2_000 },
        { audioTimeSeconds: 2, monotonicTimeMs: 3_020 },
      ],
      5,
    );
    expect(result.maximumResidualMs).toBeGreaterThan(5);
    expect(result.valid).toBe(false);
  });

  it("requires the diagnostic source to be the only connected input", async () => {
    const isolated = (await loadProbe()).isProbeSourceIsolated;
    expect(isolated({
      probeSourceConnected: true,
      mediaElementSourceConnected: false,
      unrelatedSourceCount: 0,
    })).toBe(true);
    expect(isolated({
      probeSourceConnected: true,
      mediaElementSourceConnected: true,
      unrelatedSourceCount: 0,
    })).toBe(false);
  });

  it("requires both command signature and raster oracle in two consecutive frames", async () => {
    const confirm = (await loadProbe()).confirmRasterResponse;
    const signatureOnly = {
      commandSignatureMatches: true,
      rasterOracleMatches: false,
    };
    const valid = {
      commandSignatureMatches: true,
      rasterOracleMatches: true,
    };
    expect(confirm(signatureOnly, valid)).toEqual({
      confirmed: false,
      firstQualifyingFrame: null,
    });
    expect(confirm(valid, valid)).toEqual({
      confirmed: true,
      firstQualifyingFrame: 1,
    });
  });

  it("serializes diagnostic evidence locally as JSON without a network sink", async () => {
    const evidence = { events: [{ sampleIndex: 22_050, latencyMs: 33 }] };
    const serialized = (await loadProbe()).serializeLocalEvidence(evidence);
    expect(JSON.parse(serialized)).toEqual(evidence);
  });
});
