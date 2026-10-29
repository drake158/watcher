import type { AudioFeatures } from "../../domain/audioFeatures";
import {
  DEFAULT_RENDER_OPTIONS,
  normalizeRenderOptions,
  type VisualRenderOptions,
} from "../renderOptions";
import { resolvePaletteColor } from "../palette";

export function drawPsychedelic(
  context: CanvasRenderingContext2D,
  features: AudioFeatures,
  width: number,
  height: number,
  options: VisualRenderOptions = DEFAULT_RENDER_OPTIONS,
): void {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#080b12";
  context.fillRect(0, 0, width, height);
  if (features.frequency.length === 0 || width <= 0 || height <= 0) return;

  const normalized = normalizeRenderOptions(options);
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.12;
  const time = features.capturedAt * normalized.motion / 30_000;
  const rings = 5 + Math.round(normalized.effects * 7);
  const points = Math.min(256, Math.max(96, Math.floor(features.frequency.length / 2)));
  const saturation = Math.round(normalized.color * 100);
  let dominantBin = 1;
  for (let bin = 2; bin < features.frequency.length; bin += 1) {
    if (features.frequency[bin]! > features.frequency[dominantBin]!) dominantBin = bin;
  }
  const dominantFrequencyHz = (dominantBin * features.sampleRateHz) / features.fftSize;
  const signalHue = 205 + Math.min(1, Math.max(0, (dominantFrequencyHz - 220) / 660)) * 120;
  context.lineWidth = Math.max(1, width / 900);
  context.shadowColor = "rgba(105, 242, 255, 0.58)";
  context.shadowBlur = Math.min(16, width / 65) * normalized.effects;

  for (let ring = 0; ring < rings; ring += 1) {
    context.beginPath();
    for (let point = 0; point <= points; point += 1) {
      const angle = (point / points) * Math.PI * 2;
      const bin = Math.floor((point / points) * features.frequency.length);
      const magnitude = features.frequency[bin]! / 255;
      const wave = Math.sin(angle * (3 + ring % 5) + time + ring) *
        normalized.effects * normalized.motion * 0.13;
      const radius = baseRadius * (1 + ring * 0.37 + wave + magnitude * normalized.effects * 0.24);
      const x = centerX + Math.cos(angle + time * 0.05) * radius;
      const y = centerY + Math.sin(angle + time * 0.05) * radius;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.strokeStyle = resolvePaletteColor(
      options.selectedPresetId,
      signalHue + ring * 7,
      saturation,
    );
    context.stroke();
  }
  context.shadowBlur = 0;
}
