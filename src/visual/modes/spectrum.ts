import type { AudioFeatures } from "../../domain/audioFeatures";
import { DEFAULT_RENDER_OPTIONS, type VisualRenderOptions } from "../renderOptions";
import { resolvePaletteColor } from "../palette";

export function drawSpectrum(
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

  const count = Math.min(96, Math.max(24, Math.floor(width / 9)));
  const gap = Math.max(1, width * 0.006);
  const barWidth = Math.max(1, (width - (count - 1) * gap) / count);
  const frequency = features.frequency;
  const gradient = context.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, resolvePaletteColor(options.selectedPresetId, 0, options.colorIntensity));
  gradient.addColorStop(0.52, resolvePaletteColor(options.selectedPresetId, 180, options.colorIntensity));
  gradient.addColorStop(1, resolvePaletteColor(options.selectedPresetId, 330, options.colorIntensity));
  context.fillStyle = gradient;
  context.shadowColor = "rgba(102, 238, 255, 0.6)";
  context.shadowBlur = Math.min(10, width / 100) * Math.min(1, options.effectIntensity / 100);

  for (let bar = 0; bar < count; bar += 1) {
    // Log-like sampling gives bass bins useful screen width without losing highs.
    const position = (bar + 1) / count;
    const bin = Math.min(
      frequency.length - 1,
      Math.floor(position * position * frequency.length),
    );
    const magnitude = frequency[bin]! / 255;
    const visualMagnitude = Math.sqrt(magnitude);
    const barHeight = Math.max(1, visualMagnitude * height * 0.84);
    const x = bar * (barWidth + gap);
    context.fillRect(x, height - barHeight, barWidth, barHeight);
  }
  context.shadowBlur = 0;
}
