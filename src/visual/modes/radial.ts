import type { AudioFeatures } from "../../domain/audioFeatures";
import { DEFAULT_RENDER_OPTIONS, type VisualRenderOptions } from "../renderOptions";
import { resolvePaletteColor } from "../palette";

export function drawRadial(
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

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.16;
  const maxRadius = Math.min(width, height) * 0.44;
  const bins = features.frequency;
  const spokes = Math.min(180, Math.max(96, Math.floor(width / 3)));
  const lowestHz = 30;
  const highestHz = features.sampleRateHz / 2;
  const rotation = (features.capturedAt * Math.min(1, Math.max(0, options.motion / 100))) / 10_000;
  context.lineWidth = Math.max(1, Math.min(3, width / 400));
  context.shadowColor = "rgba(255, 104, 232, 0.55)";
  context.shadowBlur = Math.min(12, width / 80) * Math.min(1, options.effectIntensity / 100);

  for (let index = 0; index < spokes; index += 1) {
    const spokeFrequencyHz = lowestHz * (highestHz / lowestHz) ** (index / spokes);
    const bin = Math.min(
      bins.length - 1,
      Math.round(spokeFrequencyHz * features.fftSize / features.sampleRateHz),
    );
    let peak = 0;
    for (let neighbor = Math.max(1, bin - 2); neighbor <= Math.min(bins.length - 1, bin + 2); neighbor += 1) {
      peak = Math.max(peak, bins[neighbor]!);
    }
    const magnitude = peak / 255;
    const visualMagnitude = Math.sqrt(magnitude);
    const frequencyHz = (bin * features.sampleRateHz) / features.fftSize;
    const bandGain = frequencyHz < 250 ? 0.35 : frequencyHz < 2_000 ? 1.35 : 1.2;
    const angle = (index / spokes) * Math.PI * 2 + rotation;
    const innerRadius = baseRadius;
    const outerRadius = Math.min(
      maxRadius,
      baseRadius + visualMagnitude * (maxRadius - baseRadius) * bandGain,
    );
    context.beginPath();
    context.moveTo(
      centerX + Math.cos(angle) * innerRadius,
      centerY + Math.sin(angle) * innerRadius,
    );
    context.lineTo(
      centerX + Math.cos(angle) * outerRadius,
      centerY + Math.sin(angle) * outerRadius,
    );
    context.strokeStyle = resolvePaletteColor(options.selectedPresetId, (index / spokes) * 360, options.colorIntensity);
    context.stroke();
  }
  context.beginPath();
  context.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
  context.strokeStyle = "rgba(170, 198, 225, 0.34)";
  context.lineWidth = Math.max(1, width / 900);
  context.stroke();
  context.shadowBlur = 0;
}
