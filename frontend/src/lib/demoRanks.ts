/**
 * Deterministic demo "world place" from email + metric (not real analytics).
 */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function estimateWorldRankByPrompts(email: string, prompts: number): number {
  const h = hash32(`${email}\0prompts`);
  const boost = Math.min(Math.floor(Math.log1p(Math.max(0, prompts)) * 420_000), 5_200_000);
  const base = 1_800_000 + (h % 9_200_000);
  return Math.max(1, base - boost + ((h >>> 12) % 180_000));
}

export function estimateWorldRankByTokens(email: string, tokens: number): number {
  const h = hash32(`${email}\0tokens`);
  const boost = Math.min(Math.floor(Math.log1p(Math.max(0, tokens) / 1000) * 380_000), 5_800_000);
  const base = 2_200_000 + (h % 8_800_000);
  return Math.max(1, base - boost + ((h >>> 14) % 220_000));
}
