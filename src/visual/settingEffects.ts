import type { FrequencyFocus, PresetId, VisualSettings } from "../domain/settings";
import { getSensitivityGain } from "./features";

type NamedPresetId = Exclude<PresetId, "custom">;

function preset(
  id: NamedPresetId,
  values: Omit<VisualSettings, "selectedPresetId">,
): Readonly<VisualSettings> {
  return Object.freeze({ ...values, selectedPresetId: id });
}

/** Named starting palettes; all numeric values remain editable after selection. */
export const VISUAL_PRESETS: Readonly<Record<NamedPresetId, Readonly<VisualSettings>>> =
  Object.freeze({
    monochrome: preset("monochrome", {
      sensitivity: 50,
      frequencyFocus: "balanced",
      colorIntensity: 0,
      motion: 20,
      effectIntensity: 30,
    }),
    ambient: preset("ambient", {
      sensitivity: 45,
      frequencyFocus: "balanced",
      colorIntensity: 38,
      motion: 18,
      effectIntensity: 28,
    }),
    neon: preset("neon", {
      sensitivity: 55,
      frequencyFocus: "balanced",
      colorIntensity: 100,
      motion: 42,
      effectIntensity: 58,
    }),
    psychedelic: preset("psychedelic", {
      sensitivity: 62,
      frequencyFocus: "balanced",
      colorIntensity: 100,
      motion: 72,
      effectIntensity: 88,
    }),
  });

export type VisualSettingKey =
  | "sensitivity"
  | "frequencyFocus"
  | "colorIntensity"
  | "motion"
  | "effectIntensity";

export function updateVisualSetting<K extends VisualSettingKey>(
  settings: VisualSettings,
  key: K,
  value: VisualSettings[K],
): VisualSettings {
  const nextValue = key === "frequencyFocus"
    ? value
    : Math.min(100, Math.max(0, Number(value)));
  return { ...settings, [key]: nextValue } as VisualSettings;
}

export function applyVisualPreset(id: NamedPresetId): VisualSettings {
  return { ...VISUAL_PRESETS[id] };
}

export interface VisualSettingEffects {
  readonly sensitivityGain: number;
  readonly frequencyWeights: Readonly<{ bass: number; mid: number; treble: number }>;
  readonly colorStrength: number;
  readonly motionScale: number;
  readonly effectScale: number;
}

function weights(focus: FrequencyFocus): VisualSettingEffects["frequencyWeights"] {
  if (focus === "balanced") return { bass: 1 / 3, mid: 1 / 3, treble: 1 / 3 };
  return {
    bass: focus === "bass" ? 1 : 0,
    mid: focus === "mid" ? 1 : 0,
    treble: focus === "treble" ? 1 : 0,
  };
}

export function getVisualSettingEffects(settings: VisualSettings): VisualSettingEffects {
  return {
    sensitivityGain: getSensitivityGain(settings.sensitivity),
    frequencyWeights: weights(settings.frequencyFocus),
    colorStrength: settings.colorIntensity / 100,
    motionScale: settings.motion / 100,
    effectScale: settings.effectIntensity / 100,
  };
}
