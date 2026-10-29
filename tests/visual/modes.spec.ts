import { expect, test } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const tone = path.resolve("tests/fixtures/audio/tone.wav");
const modes = ["Waveform", "Spectrum", "Radial", "Particle", "Psychedelic"];
const reviewViewports = [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
] as const;
const visualEvidenceDirectory = path.resolve("test-results/SC-004");

test("each visual mode is selectable and produces visible raster output", async ({ page }) => {
  await page.goto("/");
  await page.locator("#audio-file-picker").setInputFiles(tone);
  await page.getByRole("button", { name: "Load tone.wav" }).click();
  await page.getByRole("button", { name: "Play" }).click();
  await mkdir(visualEvidenceDirectory, { recursive: true });

  const selector = page.getByRole("combobox", { name: "Visual mode" });
  await expect(selector.locator("option")).toHaveText(modes);
  for (const mode of modes) {
    await selector.selectOption({ label: mode });
    await expect.poll(async () => page.locator("#visualizer-canvas").evaluate((canvas) => {
      const element = canvas as HTMLCanvasElement;
      const context = element.getContext("2d");
      if (context === null || element.width === 0 || element.height === 0) return 0;
      const pixels = context.getImageData(0, 0, element.width, element.height).data;
      let foregroundPixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index]! > 70 || pixels[index + 1]! > 70 || pixels[index + 2]! > 70) {
          foregroundPixels += 1;
        }
      }
      return foregroundPixels;
    })).toBeGreaterThan(100);
    const slug = mode.toLowerCase();
    for (const viewport of reviewViewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(visualEvidenceDirectory, `${slug}-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
        timeout: 30_000,
      });
    }
  }
  for (const viewport of reviewViewports) {
    await page.setViewportSize(viewport);
    await page.locator(".visual-settings").screenshot({
      path: path.join(visualEvidenceDirectory, `settings-${viewport.width}x${viewport.height}.png`),
      timeout: 30_000,
    });
  }
  await page.getByRole("combobox", { name: "Visual mode" }).selectOption("spectrum");
  for (const preset of ["monochrome", "ambient", "neon", "psychedelic"]) {
    await page.getByRole("combobox", { name: "Visual preset" }).selectOption(preset);
    await page.getByRole("button", { name: "Apply preset" }).click();
    for (const viewport of reviewViewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(visualEvidenceDirectory, `preset-${preset}-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
        timeout: 30_000,
      });
    }
  }
  await page.getByRole("button", { name: "Pause" }).click();
});

test("visual controls and editable presets persist settings without track data", async ({ page }) => {
  await page.goto("/");
  for (const preset of ["monochrome", "ambient", "neon", "psychedelic"]) {
    await page.getByRole("combobox", { name: "Visual preset" }).selectOption(preset);
    await page.getByRole("button", { name: "Apply preset" }).click();
  }
  await page.getByRole("slider", { name: "Sensitivity" }).fill("63");
  await page.getByRole("combobox", { name: "Frequency focus" }).selectOption("bass");
  await page.getByRole("slider", { name: "Color intensity" }).fill("42");
  await page.getByRole("slider", { name: "Motion" }).fill("27");
  await page.getByRole("slider", { name: "Effect intensity" }).fill("39");
  const context = page.context();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");

  await expect(reopened.getByRole("slider", { name: "Sensitivity" })).toHaveValue("63");
  await expect(reopened.getByRole("combobox", { name: "Frequency focus" })).toHaveValue("bass");
  await expect(reopened.getByRole("slider", { name: "Color intensity" })).toHaveValue("42");
  await expect(reopened.getByRole("slider", { name: "Motion" })).toHaveValue("27");
  await expect(reopened.getByRole("slider", { name: "Effect intensity" })).toHaveValue("39");
  await expect(reopened.getByRole("combobox", { name: "Visual preset" })).toHaveValue("psychedelic");
  const saved = await reopened.evaluate(() => {
    const value = localStorage.getItem("watcher.visual-settings") ?? "";
    return { value, keys: Object.keys(localStorage), settings: JSON.parse(value) };
  });
  expect(saved.keys).toEqual(["watcher.visual-settings"]);
  expect(saved.value).not.toContain("tone.wav");
  expect(saved.settings).toMatchObject({
    sensitivity: 63,
    frequencyFocus: "bass",
    colorIntensity: 42,
    motion: 27,
    effectIntensity: 39,
    selectedPresetId: "psychedelic",
  });
  await expect(reopened.getByText("No track loaded")).toBeVisible();
});
