import type { AudioFeatures } from "../../domain/audioFeatures";

export function drawWaveform(
  context: CanvasRenderingContext2D,
  features: AudioFeatures,
  width: number,
  height: number,
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
  gradient.addColorStop(0, "#a4ffff");
  gradient.addColorStop(0.5, "#ff7de9");
  gradient.addColorStop(1, "#8c9aff");
  context.beginPath();
  for (let index = 0; index < samples.length; index += 1) {
    const x = (index / (samples.length - 1)) * width;
    const y = center - samples[index]! * amplitude;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = gradient;
  context.lineWidth = Math.max(2, width / 500);
  context.shadowColor = "rgba(96, 242, 255, 0.72)";
  context.shadowBlur = Math.min(18, width / 55);
  context.stroke();
  context.shadowBlur = 0;
}
