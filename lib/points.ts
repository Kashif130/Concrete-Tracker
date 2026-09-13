// Shared parsing for Fuul's points leaderboard response shape, used by
// both the points panel and the airdrop estimator so both always agree
// on the same real number for "your points" — one place to update if
// Fuul ever changes its response shape.

export type ParsedPoints = {
  totalAmount: number | null;
  rank: number | null;
  totalAttributions: number | null;
  calculatedAt: string | null;
};

export function parsePoints(totals: unknown): ParsedPoints | null {
  if (!totals || typeof totals !== "object") return null;
  const obj = totals as Record<string, unknown>;
  const results = Array.isArray(obj.results) ? obj.results : null;
  const first =
    results && results.length > 0
      ? (results[0] as Record<string, unknown>)
      : null;
  if (!first) return null;

  return {
    totalAmount:
      typeof first.total_amount === "number" ? first.total_amount : null,
    rank: typeof first.rank === "number" ? first.rank : null,
    totalAttributions:
      typeof first.total_attributions === "number"
        ? first.total_attributions
        : null,
    calculatedAt:
      typeof obj.calculated_at === "string" ? obj.calculated_at : null,
  };
}
