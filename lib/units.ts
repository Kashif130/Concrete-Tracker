// Shared bigint -> decimal-string formatter used by every route that reads
// raw on-chain uint256 values (shares, assets, totals) and needs to show
// them as a human-readable decimal without floating-point rounding.
export function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return fractionStr ? `${whole}.${fractionStr}` : whole.toString();
}
