import {
  DEFAULT_VISUAL_SETTINGS,
  type FrequencyFocus,
  type PresetId,
  type VisualSettings,
} from "../domain/settings";

export const SETTINGS_STORAGE_KEY = "watcher.visual-settings";
export const SETTINGS_SCHEMA_VERSION = 1;

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FREQUENCY_FOCI: readonly FrequencyFocus[] = [
  "bass",
  "mid",
  "treble",
  "balanced",
];

const PRESET_IDS: readonly PresetId[] = [
  "monochrome",
  "ambient",
  "neon",
  "psychedelic",
  "custom",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, value));
}

function normalizeSettings(value: unknown): VisualSettings {
  const record = isRecord(value) ? value : {};
  const frequencyFocus = FREQUENCY_FOCI.includes(
    record.frequencyFocus as FrequencyFocus,
  )
    ? (record.frequencyFocus as FrequencyFocus)
    : DEFAULT_VISUAL_SETTINGS.frequencyFocus;
  const selectedPresetId = PRESET_IDS.includes(
    record.selectedPresetId as PresetId,
  )
    ? (record.selectedPresetId as PresetId)
    : DEFAULT_VISUAL_SETTINGS.selectedPresetId;

  return {
    sensitivity: normalizeNumber(
      record.sensitivity,
      DEFAULT_VISUAL_SETTINGS.sensitivity,
    ),
    frequencyFocus,
    colorIntensity: normalizeNumber(
      record.colorIntensity,
      DEFAULT_VISUAL_SETTINGS.colorIntensity,
    ),
    motion: normalizeNumber(record.motion, DEFAULT_VISUAL_SETTINGS.motion),
    effectIntensity: normalizeNumber(
      record.effectIntensity,
      DEFAULT_VISUAL_SETTINGS.effectIntensity,
    ),
    selectedPresetId,
  };
}

function getBrowserStorage(): SettingsStorage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** Persists validated visual preferences only; media and track data stay local to the active session. */
export class SettingsRepository {
  constructor(
    private readonly storage: SettingsStorage | null = getBrowserStorage(),
  ) {}

  load(): VisualSettings {
    if (this.storage === null) {
      return { ...DEFAULT_VISUAL_SETTINGS };
    }

    try {
      const serialized = this.storage.getItem(SETTINGS_STORAGE_KEY);
      if (serialized === null) {
        return { ...DEFAULT_VISUAL_SETTINGS };
      }

      const parsed: unknown = JSON.parse(serialized);
      if (
        !isRecord(parsed) ||
        parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION
      ) {
        return { ...DEFAULT_VISUAL_SETTINGS };
      }

      return normalizeSettings(parsed);
    } catch {
      return { ...DEFAULT_VISUAL_SETTINGS };
    }
  }

  /** Returns false when storage is blocked or full so the caller can continue in memory. */
  save(settings: VisualSettings): boolean {
    if (this.storage === null) {
      return false;
    }

    try {
      const normalized = normalizeSettings(settings);
      this.storage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          ...normalized,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
