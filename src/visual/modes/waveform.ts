import type { AudioFeatures } from "../../domain/audioFeatures";
import { DEFAULT_RENDER_OPTIONS, type VisualRenderOptions } from "../renderOptions";
import { resolvePaletteColor } from "../palette";

export function drawWaveform(
  context: CanvasRenderingContext2D,
  features: AudioFeatures,
  width: number,
  height: number,
  options: VisualRenderOptions = DEFAULT_RENDER_OPTIONS,
): void {
  const samples = features.timeDomain;
  const center = height / 2;
  const amplitude = height * 0.38;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#080b12";
  context.fillRect(0, 0, width, height);
  context.beginPath();
  context.moveTo(0, center);
  context.lineTo(width, center);
  context.strokeStyle = "rgba(130, 194, 225, 0.22)";
  context.lineWidth = Math.max(1, width / 1200);
  context.stroke();

  if (samples.length === 0) return;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, resolvePaletteColor(options.selectedPresetId, 0, options.colorIntensity));
  gradient.addColorStop(0.5, resolvePaletteColor(options.selectedPresetId, 180, options.colorIntensity));
  gradient.addColorStop(1, resolvePaletteColor(options.selectedPresetId, 300, options.colorIntensity));
  context.beginPath();
  for (let index = 0; index < samples.length; index += 1) {
    const x = (index / (samples.length - 1)) * width;
    const y = center - samples[index]! * amplitude;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = gradient;
  context.lineWidth = Math.max(2, width / 500);
  context.shadowColor = resolvePaletteColor(options.selectedPresetId, 190, options.colorIntensity);
  context.shadowBlur = Math.min(18, width / 55) * Math.min(1, options.effectIntensity / 100);
  context.stroke();
  context.shadowBlur = 0;
}
