import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44_100;
const CHANNELS = 2;
const SAMPLE_COUNT = SAMPLE_RATE * 10;
const AMPLITUDE = 10 ** (-12 / 20);
const OUTPUT_DIR = fileURLToPath(
  new URL("../tests/fixtures/audio/", import.meta.url),
);
const FIXTURE_NAMES = [
  "tone.wav",
  "sweep.wav",
  "tone.mp3",
  "sweep.mp3",
  "truncated.wav",
  "unsupported.txt",
  "manifest.json",
];

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`${command} could not run: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr.trim()}`,
    );
  }

  return result.stdout;
}

function makePcmSignal(kind) {
  const pcm = Buffer.alloc(SAMPLE_COUNT * CHANNELS * 2);

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const time = index / SAMPLE_RATE;
    const phase =
      kind === "tone"
        ? 2 * Math.PI * 440 * time
        : 2 * Math.PI * (110 * time + 38.5 * time ** 2);
    const sample = Math.round(AMPLITUDE * Math.sin(phase) * 32_767);
    const frameOffset = index * CHANNELS * 2;
    pcm.writeInt16LE(sample, frameOffset);
    pcm.writeInt16LE(sample, frameOffset + 2);
  }

  return pcm;
}

function makeWav(kind) {
  const pcm = makePcmSignal(kind);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * CHANNELS * 2, 28);
  header.writeUInt16LE(CHANNELS * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const versionOutput = run(ffmpeg, ["-version"]);
  const version = versionOutput.split(/\r?\n/, 1)[0];
  const encoders = run(ffmpeg, ["-hide_banner", "-encoders"]);
  if (!encoders.includes("libmp3lame")) {
    throw new Error(
      `The selected FFmpeg build does not provide libmp3lame: ${version}`,
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const name of FIXTURE_NAMES) {
    try {
      await readFile(path.join(OUTPUT_DIR, name));
      throw new Error(
        `Refusing to overwrite existing fixture ${name}; review/remove that file first.`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Refusing to overwrite")
      ) {
        throw error;
      }
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const stagingDir = await mkdtemp(path.join(OUTPUT_DIR, ".stage-"));
  try {
    const tonePath = path.join(stagingDir, "tone.wav");
    const sweepPath = path.join(stagingDir, "sweep.wav");
    await writeFile(tonePath, makeWav("tone"));
    await writeFile(sweepPath, makeWav("sweep"));

    for (const name of ["tone", "sweep"]) {
      run(ffmpeg, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        path.join(stagingDir, `${name}.wav`),
        "-map_metadata",
        "-1",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "128k",
        "-minrate",
        "128k",
        "-maxrate",
        "128k",
        "-bufsize",
        "64k",
        "-ar",
        String(SAMPLE_RATE),
        "-ac",
        String(CHANNELS),
        "-id3v2_version",
        "0",
        "-write_xing",
        "0",
        "-f",
        "mp3",
        path.join(stagingDir, `${name}.mp3`),
      ]);
    }

    const tone = await readFile(tonePath);
    await writeFile(
      path.join(stagingDir, "truncated.wav"),
      tone.subarray(0, 20),
    );
    await writeFile(
      path.join(stagingDir, "unsupported.txt"),
      "WATCHER unsupported audio fixture",
      "utf8",
    );

    const definitions = [
      {
        filename: "tone.wav",
        durationSeconds: 10,
        encoding: "stereo signed 16-bit PCM WAV",
        sampleRateHz: SAMPLE_RATE,
        expectedResult: "playable; reports 10 seconds within 0.02 seconds",
        recipe: "440 Hz sine tone at -12 dBFS duplicated in both channels",
      },
      {
        filename: "sweep.wav",
        durationSeconds: 10,
        encoding: "stereo signed 16-bit PCM WAV",
        sampleRateHz: SAMPLE_RATE,
        expectedResult: "playable; reports 10 seconds within 0.02 seconds",
        recipe: "linear 110 Hz to 880 Hz sine sweep at -12 dBFS",
      },
      ...["tone", "sweep"].map((name) => ({
        filename: `${name}.mp3`,
        durationSeconds: 10,
        encoding: "stereo MPEG-1 Layer III, 128 kbps CBR",
        sampleRateHz: SAMPLE_RATE,
        expectedResult: "playable; reports 10 seconds within 0.2 seconds",
        recipe: `encoded from synthetic ${name}.wav using libmp3lame`,
      })),
      {
        filename: "truncated.wav",
        durationSeconds: null,
        encoding: "first 20 bytes of stereo signed 16-bit PCM WAV",
        sampleRateHz: SAMPLE_RATE,
        expectedResult: "unreadable; valid selected tracks remain usable",
        recipe: "first 20 bytes of tone.wav",
      },
      {
        filename: "unsupported.txt",
        durationSeconds: null,
        encoding: "UTF-8 plain text",
        sampleRateHz: null,
        expectedResult: "unsupported; valid selected tracks remain usable",
        recipe: "WATCHER unsupported audio fixture",
      },
    ];

    const fixtures = [];
    for (const definition of definitions) {
      const bytes = await readFile(path.join(stagingDir, definition.filename));
      fixtures.push({
        ...definition,
        sizeBytes: bytes.length,
        sha256: sha256(bytes),
      });
    }

    const manifest = {
      corpus: "WATCHER synthetic audio compatibility fixtures",
      generatedFromCopyrightedAudio: false,
      sampleRateHz: SAMPLE_RATE,
      channels: CHANNELS,
      bitDepth: 16,
      pcmGenerator: `Node.js ${process.version}; deterministic integer PCM generator`,
      mp3Encoder: { name: "FFmpeg libmp3lame", version },
      fixtures,
      zeroByteSupplementalCase:
        "Not included in this six-file corpus; create a separate zero-byte File during the test.",
    };
    await writeFile(
      path.join(stagingDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    for (const name of FIXTURE_NAMES) {
      await rename(path.join(stagingDir, name), path.join(OUTPUT_DIR, name));
    }

    console.log(`Generated ${fixtures.length} synthetic fixtures in ${OUTPUT_DIR}`);
    console.log(`MP3 encoder: ${version}`);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Audio fixture generation failed: ${error.message}`);
  process.exitCode = 1;
});
