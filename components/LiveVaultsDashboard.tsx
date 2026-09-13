"use client";

import { useEffect, useMemo, useState } from "react";
import EarningsChart, { type ChartPoint } from "./EarningsChart";
import AllocationBars, { type AllocationSlice } from "./AllocationBars";

type LiveVault = {
  address: string;
  chain: string;
  label: string;
  note?: string;
  referenceApy?: number;
  apyLabel?: string;
  tvlApprox?: string;
  curator?: string;
  permissionRequired?: boolean;
  depositUrl?: string;
  name: string | null;
  symbol: string | null;
  underlyingSymbol: string | null;
  totalAssetsFormatted: string | null;
  sharePrice: number | null;
  blockNumber: string | null;
  error?: string;
};

type ApiResponse = {
  fetchedAt: string;
  chains: { chain: string; blockNumber: string | null }[];
  vaults: LiveVault[];
};

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const HORIZONS = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 180, label: "180d" },
  { days: 365, label: "1y" },
];

type Strategy = "max" | "weighted" | "equal";

export default function LiveVaultsDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(10000);
  const [strategy, setStrategy] = useState<Strategy>("weighted");
  const [includePermissioned, setIncludePermissioned] = useState(false);
  const [horizonDays, setHorizonDays] = useState(365);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set(["ethereum", "arbitrum", "base"]));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/vaults", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) setError(json.error ?? "Failed to load vault data.");
          else setData(json);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load vault data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const vaults = data?.vaults ?? [];
  const okVaults = vaults.filter((v) => !v.error);

  const tvlByChain = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const v of okVaults) {
      if (!v.totalAssetsFormatted || !v.underlyingSymbol) continue;
      const n = Number(v.totalAssetsFormatted);
      if (Number.isNaN(n)) continue;
      const bySymbol = map.get(v.chain) ?? new Map<string, number>();
      bySymbol.set(v.underlyingSymbol, (bySymbol.get(v.underlyingSymbol) ?? 0) + n);
      map.set(v.chain, bySymbol);
    }
    return map;
  }, [okVaults]);

  const chainsPresent = Array.from(new Set(vaults.map((v) => v.chain)));

  function toggleChain(c: string) {
    setSelectedChains((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  // --- Optimizer -----------------------------------------------------
  const eligible = useMemo(
    () =>
      okVaults.filter(
        (v) =>
          typeof v.referenceApy === "number" &&
          v.referenceApy > 0 &&
          selectedChains.has(v.chain) &&
          (includePermissioned || !v.permissionRequired)
      ),
    [okVaults, selectedChains, includePermissioned]
  );

  const allocation: AllocationSlice[] = useMemo(() => {
    if (eligible.length === 0) return [];
    const sorted = [...eligible].sort((a, b) => (b.referenceApy ?? 0) - (a.referenceApy ?? 0));

    if (strategy === "max") {
      const top = sorted[0];
      return [
        {
          label: top.name ?? top.label,
          chain: top.chain,
          weight: 1,
          amount,
          apy: top.referenceApy ?? null,
        },
      ];
    }

    const pool = strategy === "equal" ? sorted : sorted.slice(0, 4);

    if (strategy === "equal") {
      const w = 1 / pool.length;
      return pool.map((v) => ({
        label: v.name ?? v.label,
        chain: v.chain,
        weight: w,
        amount: amount * w,
        apy: v.referenceApy ?? null,
      }));
    }

    // weighted: proportional to reference APY among the top 4 eligible vaults
    const totalApy = pool.reduce((sum, v) => sum + (v.referenceApy ?? 0), 0);
    return pool.map((v) => {
      const w = (v.referenceApy ?? 0) / totalApy;
      return {
        label: v.name ?? v.label,
        chain: v.chain,
        weight: w,
        amount: amount * w,
        apy: v.referenceApy ?? null,
      };
    });
  }, [eligible, strategy, amount]);

  const blendedApy = allocation.reduce((sum, s) => sum + s.weight * (s.apy ?? 0), 0);

  const growthCurve: ChartPoint[] = useMemo(() => {
    if (allocation.length === 0) return [];
    const dailyRate = Math.pow(1 + blendedApy, 1 / 365) - 1;
    const stepCount = 8;
    const points: ChartPoint[] = [];
    for (let i = 0; i <= stepCount; i++) {
      const day = Math.round((horizonDays * i) / stepCount);
      points.push({ day, value: amount * Math.pow(1 + dailyRate, day) });
    }
    return points;
  }, [allocation.length, blendedApy, horizonDays, amount]);

  const milestoneValue = (days: number) => {
    if (allocation.length === 0) return null;
    const dailyRate = Math.pow(1 + blendedApy, 1 / 365) - 1;
    return amount * Math.pow(1 + dailyRate, days);
  };

  return (
    <div className="space-y-10">
      {/* Hero stats */}
      <section className="relative overflow-hidden border border-concreteMuted/40 bg-gradient-to-br from-surface via-surface to-slab/60 px-6 py-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brass/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-steel/10 blur-3xl" />
        <p className="mb-2 font-mono text-xs text-steelBright">app.concrete.xyz · live vault registry</p>
        <h1 className="text-3xl text-ink sm:text-4xl">Live Vaults 🗿</h1>
        <p className="mt-3 max-w-2xl text-sm text-inkMuted">
          Every known Concrete vault, read directly on-chain — no indexer, no cache — plus a simple
          allocation optimizer and compound-growth projection.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Vaults tracked" value={String(vaults.length)} />
          <StatCard label="Live reads OK" value={String(okVaults.length)} />
          <StatCard label="Chains" value={String(chainsPresent.length || 3)} />
          <StatCard
            label="Fetched"
            value={data ? new Date(data.fetchedAt).toLocaleTimeString() : "—"}
          />
        </div>
      </section>

      {error && (
        <p className="border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-rust">{error}</p>
      )}

      {/* Vault grid */}
      <section>
        <h2 className="mb-4 text-lg text-ink">All vaults</h2>
        {loading ? (
          <p className="border border-concreteMuted/40 bg-surface px-4 py-3 text-sm text-inkMuted">
            Reading chain…
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vaults.map((v) => (
              <VaultCard key={`${v.chain}-${v.address}`} v={v} />
            ))}
          </div>
        )}

        {Array.from(tvlByChain.entries()).map(([chain, bySymbol]) => (
          <div key={chain} className="mt-3 flex flex-wrap items-center gap-3 text-xs text-inkMuted">
            <span className="uppercase tracking-wide">{chain} TVL:</span>
            {Array.from(bySymbol.entries()).map(([symbol, total]) => (
              <span key={symbol} className="font-mono text-brass">
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
              </span>
            ))}
          </div>
        ))}
      </section>

      {/* Optimizer + prediction */}
      <section className="border border-concreteMuted/40 bg-surface">
        <header className="border-b border-concreteMuted/40 px-6 py-4">
          <h2 className="text-lg text-ink">Vault optimizer &amp; earning prediction</h2>
          <p className="mt-1 text-xs text-inkMuted">
            Uses each vault&apos;s publicly reported APY (see card above — a periodic snapshot, not a
            live feed, since Concrete doesn&apos;t expose an on-chain APY oracle) to suggest a split and
            project compound growth. Vaults span different underlying assets (USDT, WBTC, ETH, …) with
            no live price feed here, so treat the amount below as a single illustrative unit of
            capital, not a $-accurate cross-asset total. Not financial advice.
          </p>
        </header>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Controls */}
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-inkMuted">
                Amount to allocate
              </label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2.5 font-mono text-sm text-ink"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-inkMuted">Strategy</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {(
                  [
                    ["max", "Max APY (single vault)"],
                    ["weighted", "Weighted by APY (top 4)"],
                    ["equal", "Equal split (diversified)"],
                  ] as [Strategy, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStrategy(key)}
                    className={`focus-ring border px-3 py-1.5 transition-colors ${
                      strategy === key
                        ? "border-brass bg-brass/10 text-brass"
                        : "border-concreteMuted/40 text-inkMuted hover:bg-slab"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-inkMuted">Chains</label>
              <div className="flex flex-wrap gap-3 text-sm text-inkMuted">
                {["ethereum", "arbitrum", "base"].map((c) => (
                  <label key={c} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={selectedChains.has(c)} onChange={() => toggleChain(c)} />
                    {c[0].toUpperCase() + c.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-sm text-inkMuted">
              <input
                type="checkbox"
                checked={includePermissioned}
                onChange={(e) => setIncludePermissioned(e.target.checked)}
              />
              Include permission-required vaults
            </label>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-inkMuted">
                Projection horizon
              </label>
              <div className="flex gap-2 text-xs">
                {HORIZONS.map((h) => (
                  <button
                    key={h.days}
                    type="button"
                    onClick={() => setHorizonDays(h.days)}
                    className={`focus-ring border px-3 py-1.5 transition-colors ${
                      horizonDays === h.days
                        ? "border-steelBright bg-steel/10 text-steelBright"
                        : "border-concreteMuted/40 text-inkMuted hover:bg-slab"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {allocation.length === 0 ? (
              <p className="text-sm text-inkMuted">
                No eligible vaults with a published APY match these filters — try including
                permission-required vaults or selecting more chains.
              </p>
            ) : (
              <>
                <div className="border border-concreteMuted/30 bg-gradient-to-br from-surface to-slab/40 p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wide text-inkMuted">Suggested allocation</span>
                    <span className="font-mono text-sm text-brass">
                      blended ~{(blendedApy * 100).toFixed(2)}% APY
                    </span>
                  </div>
                  <AllocationBars slices={allocation} currency="units" />
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-inkMuted">Projected growth</div>
                  <EarningsChart points={growthCurve} unitLabel="value (units)" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {HORIZONS.map((h) => {
                    const v = milestoneValue(h.days);
                    return (
                      <div key={h.days} className="border border-concreteMuted/30 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-inkMuted">{h.label}</div>
                        <div className="font-mono text-sm text-ink">
                          {v !== null ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                        </div>
                        {v !== null && (
                          <div className="font-mono text-[10px] text-brass">
                            +{(v - amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-concreteMuted/30 pt-6 text-xs text-inkMuted">
        Independent, third-party tool. Not built or endorsed by Blueprint Finance. APY figures are
        periodic snapshots reported by app.concrete.xyz, not live-fetched. Verify anything financially
        material against app.concrete.xyz yourself. Not financial advice.
      </footer>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-concreteMuted/30 bg-base/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-inkMuted">{label}</div>
      <div className="font-mono text-lg text-ink">{value}</div>
    </div>
  );
}

function VaultCard({ v }: { v: LiveVault }) {
  return (
    <div className="group relative overflow-hidden border border-concreteMuted/40 bg-surface p-4 transition-colors hover:border-brass/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-ink">{v.name ?? v.label}</div>
          <div className="font-mono text-[11px] text-inkMuted" title={v.address}>
            {truncate(v.address)}
          </div>
        </div>
        <span className="border border-concreteMuted/40 px-1.5 py-0.5 text-[9px] uppercase text-inkMuted">
          {v.chain}
        </span>
      </div>

      {v.error ? (
        <p className="font-mono text-xs text-rust">{v.error}</p>
      ) : (
        <div className="space-y-1.5">
          <Row label="TVL" value={`${v.totalAssetsFormatted ?? "—"} ${v.underlyingSymbol ?? ""}`.trim()} />
          <Row label="Share price" value={v.sharePrice !== null ? v.sharePrice.toFixed(6) : "—"} />
          {v.referenceApy !== undefined && (
            <Row
              label={v.apyLabel ?? "APY"}
              value={`${(v.referenceApy * 100).toFixed(2)}%`}
              valueClassName="text-brass"
            />
          )}
          {v.curator && <Row label="Curator" value={v.curator} />}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {v.permissionRequired && (
          <span className="border border-rust/40 px-1.5 py-0.5 text-[9px] uppercase text-rust">
            Permission required
          </span>
        )}
        {v.depositUrl && (
          <a
            href={v.depositUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto font-mono text-[11px] text-steelBright underline"
          >
            Deposit ↗
          </a>
        )}
      </div>

      {v.note && <p className="mt-2 text-[10px] leading-relaxed text-inkMuted/80">{v.note}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName = "text-ink",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-inkMuted">{label}</span>
      <span className={`font-mono ${valueClassName}`}>{value}</span>
    </div>
  );
}
