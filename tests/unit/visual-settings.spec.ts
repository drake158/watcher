import { describe, expect, it } from "vitest";
import { DEFAULT_VISUAL_SETTINGS } from "../../src/domain/settings";
import { SettingsRepository } from "../../src/persistence/SettingsRepository";

type EffectSettings = typeof DEFAULT_VISUAL_SETTINGS;
interface VisualEffectsModule {
  applyVisualPreset(id: "monochrome" | "ambient" | "neon" | "psychedelic"): EffectSettings;
  getVisualSettingEffects(settings: EffectSettings): {
    sensitivityGain: number;
    frequencyWeights: { bass: number; mid: number; treble: number };
    colorStrength: number;
    motionScale: number;
    effectScale: number;
  };
  updateVisualSetting<K extends keyof EffectSettings>(
    settings: EffectSettings,
    key: K,
    value: EffectSettings[K],
  ): EffectSettings;
  VISUAL_PRESETS: Record<"monochrome" | "ambient" | "neon" | "psychedelic", EffectSettings>;
}

const loadEffects = async (): Promise<VisualEffectsModule> =>
  (await import("../../src/visual/settingEffects")) as VisualEffectsModule;

describe("visual settings", () => {
  it("retains the approved first-run defaults through persistence", () => {
    const values = new Map<string, string>();
    const repository = new SettingsRepository({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    });

    expect(repository.load()).toEqual(DEFAULT_VISUAL_SETTINGS);
    expect(repository.save(DEFAULT_VISUAL_SETTINGS)).toBe(true);
    expect(repository.load()).toEqual(DEFAULT_VISUAL_SETTINGS);
  });

  it("maps each of the five controls to a distinct adjustable visual effect", () => {
    return loadEffects().then(({ getVisualSettingEffects, updateVisualSetting }) => {
    const baseline = getVisualSettingEffects(DEFAULT_VISUAL_SETTINGS);
    const highSensitivity = getVisualSettingEffects(
      updateVisualSetting(DEFAULT_VISUAL_SETTINGS, "sensitivity", 100),
    );
    const bassFocus = getVisualSettingEffects(
      updateVisualSetting(DEFAULT_VISUAL_SETTINGS, "frequencyFocus", "bass"),
    );
    const noColor = getVisualSettingEffects(
      updateVisualSetting(DEFAULT_VISUAL_SETTINGS, "colorIntensity", 0),
    );
    const noMotion = getVisualSettingEffects(
      updateVisualSetting(DEFAULT_VISUAL_SETTINGS, "motion", 0),
    );
    const noEffects = getVisualSettingEffects(
      updateVisualSetting(DEFAULT_VISUAL_SETTINGS, "effectIntensity", 0),
    );

    expect(highSensitivity.sensitivityGain).toBeGreaterThan(baseline.sensitivityGain);
    expect(bassFocus.frequencyWeights).toEqual({ bass: 1, mid: 0, treble: 0 });
    expect(noColor.colorStrength).toBe(0);
    expect(noMotion.motionScale).toBe(0);
    expect(noEffects.effectScale).toBe(0);
    });
  });

  it("provides four independent, editable named presets", () => {
    return loadEffects().then(({ applyVisualPreset, updateVisualSetting, VISUAL_PRESETS }) => {
    expect(Object.keys(VISUAL_PRESETS)).toEqual([
      "monochrome",
      "ambient",
      "neon",
      "psychedelic",
    ]);
    for (const presetId of Object.keys(VISUAL_PRESETS) as Array<keyof typeof VISUAL_PRESETS>) {
      const applied = applyVisualPreset(presetId);
      const edited = updateVisualSetting(applied, "colorIntensity", 17);
      expect(applied.selectedPresetId).toBe(presetId);
      expect(edited.colorIntensity).toBe(17);
      expect(VISUAL_PRESETS[presetId]).not.toBe(edited);
    }
    });
  });
});
