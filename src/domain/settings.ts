export type FrequencyFocus = "bass" | "mid" | "treble" | "balanced";

export type PresetId =
  | "monochrome"
  | "ambient"
  | "neon"
  | "psychedelic"
  | "custom";

export interface VisualSettings {
  readonly sensitivity: number;
  readonly frequencyFocus: FrequencyFocus;
  readonly colorIntensity: number;
  readonly motion: number;
  readonly effectIntensity: number;
  readonly selectedPresetId: PresetId;
}

/** Defaults approved in the WATCHER product specification. */
export const DEFAULT_VISUAL_SETTINGS: Readonly<VisualSettings> =
  Object.freeze({
    sensitivity: 50,
    frequencyFocus: "balanced",
    colorIntensity: 60,
    motion: 35,
    effectIntensity: 45,
    // No named palette is selected until the user applies a preset.
    selectedPresetId: "custom",
  });
