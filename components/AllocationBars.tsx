"use client";

export type AllocationSlice = {
  label: string;
  chain: string;
  weight: number; // 0..1
  amount: number;
  apy: number | null;
};

export default function AllocationBars({
  slices,
  currency,
}: {
  slices: AllocationSlice[];
  currency: string;
}) {
  if (slices.length === 0) return null;
  const maxWeight = Math.max(...slices.map((s) => s.weight), 0.0001);

  return (
    <div className="space-y-3">
      {slices.map((s, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-ink">
              {s.label}{" "}
              <span className="border border-concreteMuted/40 px-1 py-0.5 text-[9px] uppercase text-inkMuted">
                {s.chain}
              </span>
            </span>
            <span className="whitespace-nowrap font-mono text-inkMuted">
              {(s.weight * 100).toFixed(1)}% · {s.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              {currency}
              {s.apy !== null && <span className="text-brass"> · {(s.apy * 100).toFixed(2)}% APY</span>}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden bg-slab">
            <div
              className="h-full bg-gradient-to-r from-steel to-brass"
              style={{ width: `${(s.weight / maxWeight) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
