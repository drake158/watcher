import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const fixturesDirectory = path.resolve("tests/fixtures/audio");
const validFixtures = ["tone.wav", "sweep.wav", "tone.mp3", "sweep.mp3"];

async function openWatcher(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WATCHER" })).toBeVisible();
}

async function supportsWebAudio(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() =>
    typeof window.AudioContext === "function" ||
    typeof (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext === "function",
  );
}

test.describe("local audio import and playback", () => {
  for (const filename of validFixtures) {
    test(`imports and plays ${filename} to completion`, async ({ page }) => {
      await openWatcher(page);
      test.skip(!(await supportsWebAudio(page)), "Web Audio API unavailable in this installed browser build");
      await page.locator("#audio-file-picker").setInputFiles(
        path.join(fixturesDirectory, filename),
      );
      await page.getByRole("button", { name: `Load ${filename}` }).click();
      await expect(
        page.getByRole("button", { name: `Load ${filename}` }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Play" }).click();

      await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
      await expect(page.locator("#playback-status")).toHaveText(
        `Playing ${filename}.`,
      );
      await expect(page.locator("#playback-status")).toHaveText(
        `${filename} ended.`,
        { timeout: 18_000 },
      );
      await expect(page.locator(".time-readout")).toContainText("00:10");
    });
  }

  test("keeps valid audio usable beside corrupt, unsupported, and zero-byte inputs", async ({ page }) => {
    await openWatcher(page);
    test.skip(!(await supportsWebAudio(page)), "Web Audio API unavailable in this installed browser build");
    await page.locator("#audio-file-picker").setInputFiles([
      {
        name: "tone.wav",
        mimeType: "audio/wav",
        buffer: await readFile(path.join(fixturesDirectory, "tone.wav")),
      },
      {
        name: "truncated.wav",
        mimeType: "audio/wav",
        buffer: await readFile(path.join(fixturesDirectory, "truncated.wav")),
      },
      {
        name: "unsupported.txt",
        mimeType: "text/plain",
        buffer: await readFile(path.join(fixturesDirectory, "unsupported.txt")),
      },
      {
        name: "zero-byte.wav",
        mimeType: "audio/wav",
        buffer: Buffer.alloc(0),
      },
    ]);

    await expect(page.getByText("truncated.wav", { exact: true })).toBeVisible();
    await expect(page.getByText("unsupported.txt", { exact: true })).toBeVisible();
    await expect(page.getByText("zero-byte.wav", { exact: true })).toBeVisible();
    await expect(page.getByText("Invalid or unreadable audio").first()).toBeVisible();
    await expect(
      page.locator("#track-list-slot .track-meta", {
        hasText: "Unsupported file",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Load tone.wav" }).click();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.locator("#playback-status")).toHaveText(
      "tone.wav ended.",
      { timeout: 18_000 },
    );
  });

  test("renders a visible waveform response to local audio", async ({ page }) => {
    await openWatcher(page);
    test.skip(!(await supportsWebAudio(page)), "Web Audio API unavailable in this installed browser build");
    await page.locator("#audio-file-picker").setInputFiles(
      path.join(fixturesDirectory, "tone.wav"),
    );
    await page.getByRole("button", { name: "Load tone.wav" }).click();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.locator("#playback-status")).toHaveText("Playing tone.wav.");
    await expect.poll(async () => page.locator("#visualizer-canvas").evaluate((canvas) => {
      const element = canvas as HTMLCanvasElement;
      const context = element.getContext("2d");
      if (context === null || element.width === 0 || element.height === 0) return 0;
      const pixels = context.getImageData(0, 0, element.width, element.height).data;
      let brightSignalPixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index]! > 110 && pixels[index + 1]! > 130 && pixels[index + 2]! > 150) {
          brightSignalPixels += 1;
        }
      }
      return brightSignalPixels;
    })).toBeGreaterThan(20);
    await page.getByRole("button", { name: "Pause" }).click();
  });

  test("operates playback controls and releases the active track when removed", async ({ page }) => {
    await openWatcher(page);
    test.skip(!(await supportsWebAudio(page)), "Web Audio API unavailable in this installed browser build");
    await page.locator("#audio-file-picker").setInputFiles(
      path.join(fixturesDirectory, "tone.wav"),
    );
    await page.getByRole("button", { name: "Load tone.wav" }).click();
    await expect(page.locator(".time-readout")).toContainText("00:10");

    const seek = page.getByRole("slider", { name: "Playback position" });
    await expect(seek).toBeEnabled();
    await seek.evaluate((element) => {
      const slider = element as HTMLInputElement;
      slider.value = "4";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator(".time-readout")).toContainText("00:04");

    await page.getByRole("slider", { name: "Volume" }).evaluate((element) => {
      const slider = element as HTMLInputElement;
      slider.value = "0.4";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.locator("#playback-status")).toHaveText("Playing tone.wav.");
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.locator("#playback-status")).toHaveText("Paused tone.wav.");
    await page.getByRole("button", { name: "Remove tone.wav" }).click();
    await expect(page.getByRole("button", { name: "Load tone.wav" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  test("keeps same-name selection occurrences distinct and removes one at a time", async ({ page }) => {
    await openWatcher(page);
    const bytes = await readFile(path.join(fixturesDirectory, "tone.wav"));
    await page.locator("#audio-file-picker").setInputFiles([
      { name: "same.wav", mimeType: "audio/wav", buffer: bytes },
      { name: "same.wav", mimeType: "audio/wav", buffer: bytes },
    ]);

    await expect(page.getByRole("button", { name: "Load same.wav" })).toHaveCount(2);
    await page.getByRole("button", { name: "Remove same.wav" }).first().click();
    await expect(page.getByRole("button", { name: "Load same.wav" })).toHaveCount(1);
  });
});
