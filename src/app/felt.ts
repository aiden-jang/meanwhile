/* How many people said they felt it, and how hard. The only human number in this app. */
const SHAKING = [
  // USGS's own words for intensity I through X, not a paraphrase. Two and three are both "weak" there,
  // and inventing a word the scale does not use is how a borrowed scale stops being the scale.
  "not felt",
  "weak",
  "weak",
  "light",
  "moderate",
  "strong",
  "very strong",
  "severe",
  "violent",
  "extreme",
];

/** One point on the intensity scale, in the scale's own word. */
export function shakingWord(intensity: number): string | null {
  if (!Number.isFinite(intensity) || intensity <= 0) return null;
  return SHAKING[Math.min(SHAKING.length - 1, Math.max(0, Math.round(intensity) - 1))] ?? null;
}

export function feltNote(felt: { reports: number; intensity?: number } | undefined): string | null {
  if (!felt || felt.reports < 1) return null;
  const who = felt.reports === 1 ? "1 person" : `${felt.reports.toLocaleString("en-GB")} people`;
  const step = felt.intensity === undefined ? null : shakingWord(felt.intensity);
  return step ? `${who}, ${step}` : who;
}
