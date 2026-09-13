"use client";

import AllocationDonut, { chainColor } from "./AllocationDonut";

export type AllocationSlice = {
  label: string;
  chain: string;
  weight: number; // 0..1
  amount: number;
  apy: number | null;
};

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

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
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex shrink-0 justify-center sm:justify-start">
        <AllocationDonut weights={slices.map((s) => s.weight)} />
      </div>

      <div className="flex-1 space-y-2.5">
        {slices.map((s, i) => {
          const barPct = (s.weight / maxWeight) * 100;
          const color = chainColor(s.chain, i);
          return (
            <div
              key={i}
              className="group relative overflow-hidden border border-concreteMuted/30 bg-base/40 px-3.5 py-3 transition-all hover:border-brass/40 hover:bg-base/70"
            >
              {/* faint fill showing this slice's share of the whole card width */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-brass/[0.07] to-transparent"
                style={{ width: `${(s.weight) * 100}%` }}
              />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${color}1f`,
                      color,
                      boxShadow: `0 0 0 1px ${color}40`,
                    }}
                  >
                    {RANK_MEDALS[i] ?? i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{s.label}</div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] uppercase tracking-wide text-inkMuted">{s.chain}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm text-ink">
                    {(s.weight * 100).toFixed(1)}<span className="text-inkMuted">%</span>
                  </div>
                  <div className="font-mono text-[10px] text-inkMuted">
                    {s.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                  </div>
                </div>

                {s.apy !== null && (
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-brass/40 bg-brass/10 px-2 py-1 font-mono text-[10px] text-brass">
                    {(s.apy * 100).toFixed(2)}% APY
                  </span>
                )}
              </div>

              <div className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slab">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-steel via-steelBright to-brass shadow-[0_0_8px_rgba(201,162,39,0.35)] transition-[width] duration-500 ease-out"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
