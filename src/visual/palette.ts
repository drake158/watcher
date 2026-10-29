import type { PresetId } from "../domain/settings";

/** A compact Y2K palette resolver shared by every canvas mode. */
export function resolvePaletteColor(
  presetId: PresetId,
  index: number,
  colorIntensity: number,
): string {
  const intensity = Math.min(100, Math.max(0, colorIntensity));
  const normalizedIndex = ((index % 360) + 360) % 360;
  if (presetId === "monochrome") {
    return `hsl(0 0% ${48 + normalizedIndex % 35}% / ${0.35 + intensity / 154})`;
  }
  if (presetId === "ambient") {
    const hue = 160 + (normalizedIndex % 70);
    return `hsl(${hue} ${Math.min(58, intensity * 0.58)}% ${54 + (normalizedIndex % 12)}% / ${0.35 + intensity / 154})`;
  }
  if (presetId === "psychedelic") {
    return `hsl(${normalizedIndex} ${intensity}% 66% / ${0.38 + intensity / 160})`;
  }
  // Neon and custom both retain the cyan / magenta / electric-blue identity.
  const hue = (185 + normalizedIndex * 1.7) % 360;
  return `hsl(${hue} ${intensity}% ${58 + (normalizedIndex % 15)}% / ${0.38 + intensity / 160})`;
}
