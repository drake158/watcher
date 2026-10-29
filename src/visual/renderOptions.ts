import type { PresetId } from "../domain/settings";

/** Visual-only knobs consumed by renderers; callers pass normalized 0–100 values. */
export interface VisualRenderOptions {
  readonly colorIntensity: number;
  readonly motion: number;
  readonly effectIntensity: number;
  readonly selectedPresetId: PresetId;
}

export const DEFAULT_RENDER_OPTIONS: Readonly<VisualRenderOptions> =
  Object.freeze({
    colorIntensity: 60,
    motion: 35,
    effectIntensity: 45,
    selectedPresetId: "custom",
  });

export function normalizeRenderOptions(
  options: VisualRenderOptions = DEFAULT_RENDER_OPTIONS,
): { color: number; motion: number; effects: number } {
  return {
    color: Math.min(1, Math.max(0, options.colorIntensity / 100)),
    motion: Math.min(1, Math.max(0, options.motion / 100)),
    effects: Math.min(1, Math.max(0, options.effectIntensity / 100)),
  };
}
