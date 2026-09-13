type VaultResult = {
  underlyingValueFormatted: string;
  underlyingSymbol: string | null;
  error?: string;
};

export default function PortfolioTotal({ vaults }: { vaults: VaultResult[] }) {
  const totals = new Map<string, number>();

  for (const v of vaults) {
    if (v.error) continue;
    const n = Number(v.underlyingValueFormatted);
    if (Number.isNaN(n) || n === 0) continue;
    const symbol = v.underlyingSymbol ?? "?";
    totals.set(symbol, (totals.get(symbol) ?? 0) + n);
  }

  if (totals.size === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 border-b border-concreteMuted/40 px-6 py-4">
      <span className="text-xs uppercase tracking-wide text-inkMuted">
        Portfolio total
      </span>
      {Array.from(totals.entries()).map(([symbol, amount]) => (
        <span key={symbol} className="font-mono text-sm text-brass">
          {amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
          {symbol}
        </span>
      ))}
      {totals.size > 1 && (
        <span className="text-xs text-inkMuted">
          (shown per underlying asset — not converted to a single unit)
        </span>
      )}
    </div>
  );
}
