export function selectHomeMarketPreview<T extends { volume24h: number }>(assets: readonly T[], limit = 3): T[] {
  return [...assets].sort((a, b) => b.volume24h - a.volume24h).slice(0, limit);
}
