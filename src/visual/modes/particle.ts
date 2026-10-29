import type { AudioFeatures } from "../../domain/audioFeatures";
import {
  DEFAULT_RENDER_OPTIONS,
  normalizeRenderOptions,
  type VisualRenderOptions,
} from "../renderOptions";
import { resolvePaletteColor } from "../palette";

export interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

/** Reuses caller-owned particle state, with a count bounded by canvas area. */
export function drawParticles(
  context: CanvasRenderingContext2D,
  features: AudioFeatures,
  width: number,
  height: number,
  particles: VisualParticle[],
  options: VisualRenderOptions = DEFAULT_RENDER_OPTIONS,
): void {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#080b12";
  context.fillRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  const normalized = normalizeRenderOptions(options);
  const targetCount = normalized.effects === 0
    ? 0
    : Math.min(180, Math.ceil((width * height) / 1_000 * normalized.effects));
  while (particles.length > targetCount) particles.pop();
  while (particles.length < targetCount) {
    const index = particles.length;
    // Deterministic initial distribution avoids per-frame allocation/randomness.
    const seed = (index * 0.61803398875) % 1;
    const angle = index * 2.399963229728653;
    const radius = Math.sqrt(seed) * Math.min(width, height) * 0.42;
    particles.push({
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      vx: Math.cos(angle) * (0.15 + seed * 0.2),
      vy: Math.sin(angle) * (0.15 + seed * 0.2),
      phase: seed * Math.PI * 2,
    });
  }

  let energy = 0;
  let weightedBin = 0;
  for (let bin = 0; bin < features.frequency.length; bin += 1) {
    const value = features.frequency[bin]!;
    energy += value;
    weightedBin += value * bin;
  }
  const level = features.frequency.length === 0 ? 0 : energy / (features.frequency.length * 255);
  const centroidHz = energy === 0
    ? 0
    : weightedBin / energy * features.sampleRateHz / features.fftSize;
  const centroid = Math.min(1, Math.max(0, (centroidHz - 220) / 660));
  const scale = normalized.motion * (0.25 + level * 1.5) * (0.5 + centroid);
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index]!;
    particle.x += particle.vx * scale;
    particle.y += particle.vy * scale;
    if (particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height) {
      particle.x = width / 2;
      particle.y = height / 2;
    }
    const alpha = 0.25 + normalized.effects * 0.7;
    const size = 1.8 + level * 3.8 * normalized.effects;
    context.beginPath();
    context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    context.fillStyle = resolvePaletteColor(
      options.selectedPresetId,
      185 + centroid * 120 + particle.phase * 15,
      options.colorIntensity,
    );
    context.globalAlpha = alpha;
    context.fill();
    context.globalAlpha = 1;
  }
}
