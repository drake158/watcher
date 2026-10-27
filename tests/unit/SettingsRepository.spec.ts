import { describe, expect, it } from "vitest";
import {
  SETTINGS_STORAGE_KEY,
  SettingsRepository,
} from "../../src/persistence/SettingsRepository";

const DEFAULT_SETTINGS = {
  sensitivity: 50,
  frequencyFocus: "balanced",
  colorIntensity: 60,
  motion: 35,
  effectIntensity: 45,
  selectedPresetId: "custom",
} as const;

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("SettingsRepository", () => {
  it("loads the approved settings defaults when no settings are stored", () => {
    const repository = new SettingsRepository(new MemoryStorage());

    expect(repository.load()).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps finite numeric settings and defaults invalid fields", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        sensitivity: -10,
        frequencyFocus: "balanced",
        colorIntensity: 140,
        motion: 25.5,
        effectIntensity: null,
        selectedPresetId: "unknown-preset",
      }),
    );

    const repository = new SettingsRepository(storage);

    expect(repository.load()).toEqual({
      ...DEFAULT_SETTINGS,
      sensitivity: 0,
      colorIntensity: 100,
      motion: 25.5,
    });
  });

  it("returns defaults for invalid JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, "{not-json");

    expect(new SettingsRepository(storage).load()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults for an unsupported schema version", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, sensitivity: 90 }),
    );

    expect(new SettingsRepository(storage).load()).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps the application usable when storage is unavailable", () => {
    const unavailableStorage = {
      getItem(): string {
        throw new Error("storage unavailable");
      },
      setItem(): void {
        throw new Error("storage unavailable");
      },
    };
    const repository = new SettingsRepository(unavailableStorage);

    expect(repository.load()).toEqual(DEFAULT_SETTINGS);
    expect(repository.save(DEFAULT_SETTINGS)).toBe(false);
  });

  it("persists only versioned visual settings", () => {
    const storage = new MemoryStorage();
    const repository = new SettingsRepository(storage);

    expect(repository.save(DEFAULT_SETTINGS)).toBe(true);
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? "null")).toEqual(
      { schemaVersion: 1, ...DEFAULT_SETTINGS },
    );
  });
});
