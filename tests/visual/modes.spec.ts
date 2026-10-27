import { expect, test } from "@playwright/test";
import path from "node:path";

const tone = path.resolve("tests/fixtures/audio/tone.wav");
const modes = ["Waveform", "Spectrum", "Radial", "Particle", "Psychedelic"];

test("each visual mode is selectable and produces visible raster output", async ({ page }) => {
  await page.goto("/");
  await page.locator("#audio-file-picker").setInputFiles(tone);
  await page.getByRole("button", { name: "Load tone.wav" }).click();
  await page.getByRole("button", { name: "Play" }).click();

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
  }
  await page.getByRole("button", { name: "Pause" }).click();
});
