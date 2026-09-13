"use client";

import { useEffect, useState } from "react";
import ShareButtons from "./ShareButtons";
import ShareCardImage from "./ShareCardImage";
import { SITE_URL } from "@/lib/siteConfig";

// Concrete has NOT announced a token, ticker, snapshot, or airdrop date as
// of this build. "$CT" below is a placeholder name used only to model
// scenarios, the same way community tools like Jumper's XP calculator do
// for other pre-token points programs. Every figure is either the user's
// own real, fetched points total, or an assumption the user explicitly
// sets — never a real allocation, promise, or prediction.

const FDV_OPTIONS = [50_000_000, 250_000_000, 500_000_000, 1_000_000_000, 3_000_000_000];

function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export default function AirdropEstimator({
  wallet,
  yourPoints,
}: {
  wallet: string;
  yourPoints: number | null;
}) {
  const [myPoints, setMyPoints] = useState(yourPoints ?? 0);
  const [usingRealPoints, setUsingRealPoints] = useState(yourPoints !== null);
  const [totalCommunityPoints, setTotalCommunityPoints] = useState(50_000_000);
  const [maxSupply, setMaxSupply] = useState(1_000_000_000);
  const [poolPct, setPoolPct] = useState(7);
  const [fdv, setFdv] = useState(250_000_000);

  // If real points arrive/update after mount (e.g. a different wallet's
  // fetch resolves), keep syncing as long as the user hasn't manually
  // overridden the field.
  useEffect(() => {
    if (usingRealPoints && yourPoints !== null) setMyPoints(yourPoints);
  }, [yourPoints, usingRealPoints]);

  const airdropPoolTokens = maxSupply * (poolPct / 100);
  const yourShare = totalCommunityPoints > 0 ? Math.min(1, myPoints / totalCommunityPoints) : 0;
  const yourTokens = airdropPoolTokens * yourShare;
  const tokenPrice = fdv / maxSupply;
  const yourUsdValue = yourTokens * tokenPrice;

  const shareText = [
    "Hypothetical $CT airdrop estimate 🏗️🗿 (unofficial — no token announced)",
    `${Math.round(yourTokens).toLocaleString()} $CT (~$${yourUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} at ${formatUsd(fdv)} FDV)`,
    `Based on ${myPoints.toLocaleString()} points`,
    `Wallet: ${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
    `via ${SITE_URL}`,
  ].join("\n");

  return (
    <section className="border border-concreteMuted/40 bg-surface">
      <header className="border-b border-concreteMuted/40 px-6 py-4">
        <h2 className="text-lg text-ink">Airdrop allocation estimator</h2>
        <p className="text-xs text-inkMuted">
          <strong className="text-rust">
            Concrete has not announced a token, ticker, snapshot, or airdrop
            date.
          </strong>{" "}
          &quot;$CT&quot; is a placeholder used only to model scenarios —
          every number below is a what-if simulation, not a claim or
          prediction of any real allocation.
        </p>
      </header>

      <div className="space-y-5 px-6 py-5">
        <div>
          <label className="mb-1.5 flex items-center justify-between text-sm text-inkMuted">
            <span>
              Your points{" "}
              <b className="text-ink">{myPoints.toLocaleString()}</b>
            </span>
            {yourPoints !== null && !usingRealPoints && (
              <button
                type="button"
                onClick={() => {
                  setUsingRealPoints(true);
                  setMyPoints(yourPoints);
                }}
                className="text-xs text-steelBright underline"
              >
                use my real points ({yourPoints.toLocaleString()})
              </button>
            )}
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(200_000, myPoints)}
            value={myPoints}
            onChange={(e) => {
              setUsingRealPoints(false);
              setMyPoints(Number(e.target.value));
            }}
            className="w-full"
          />
          {yourPoints === null && (
            <p className="mt-1 text-xs text-inkMuted">
              Points data isn&apos;t available for this wallet, so this
              starts at 0 — drag to model a scenario, or configure
              FUUL_API_KEY to auto-fill your real total.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-inkMuted">
            Estimated total community points (your guess){" "}
            <b className="text-ink">{totalCommunityPoints.toLocaleString()}</b>
          </label>
          <input
            type="range"
            min={1_000_000}
            max={500_000_000}
            step={500_000}
            value={totalCommunityPoints}
            onChange={(e) => setTotalCommunityPoints(Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-1 text-xs text-inkMuted">
            Concrete has never published a total points count — this is a
            number you supply to model a scenario.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-inkMuted">
              Airdrop pool (% of max supply){" "}
              <b className="text-ink">{poolPct}%</b>
            </label>
            <input
              type="range"
              min={1}
              max={25}
              step={0.5}
              value={poolPct}
              onChange={(e) => setPoolPct(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-inkMuted">
              Max token supply (assumption)
            </label>
            <input
              type="number"
              min={1}
              value={maxSupply}
              onChange={(e) =>
                setMaxSupply(Math.max(1, Number(e.target.value) || 0))
              }
              className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2 font-mono text-sm text-ink"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-inkMuted">
            Hypothetical FDV (for a USD estimate)
          </label>
          <div className="flex flex-wrap gap-2">
            {FDV_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFdv(opt)}
                className={`border px-3 py-1.5 text-xs ${
                  fdv === opt
                    ? "border-steel bg-steel/20 text-steelBright"
                    : "border-concreteMuted/40 text-inkMuted hover:bg-slab"
                }`}
              >
                {formatUsd(opt)}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-concreteMuted/30 pt-4">
          <div className="text-xs uppercase tracking-wide text-inkMuted">
            Estimated allocation
          </div>
          <div className="mt-1 space-y-1 font-mono text-sm">
            <div className="flex justify-between text-inkMuted">
              <span>Airdrop pool ({poolPct}% of {maxSupply.toLocaleString()})</span>
              <span className="text-ink">
                {Math.round(airdropPoolTokens).toLocaleString()} $CT
              </span>
            </div>
            <div className="flex justify-between text-inkMuted">
              <span>Your share of pool</span>
              <span className="text-ink">{(yourShare * 100).toFixed(4)}%</span>
            </div>
            <div className="flex justify-between text-inkMuted">
              <span>Your estimated $CT</span>
              <span className="text-brass">
                {Math.round(yourTokens).toLocaleString()} $CT
              </span>
            </div>
            <div className="flex justify-between text-inkMuted">
              <span>
                At {formatUsd(fdv)} FDV (${tokenPrice.toFixed(4)}/token)
              </span>
              <span className="text-ink">
                ≈ $
                {yourUsdValue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <ShareButtons text={shareText} />
        <ShareCardImage
          kicker="concrete.xyz · $CT estimate (unofficial)"
          headline={`${Math.round(yourTokens).toLocaleString()} $CT`}
          headlineLabel="Hypothetical allocation"
          wallet={wallet}
          filename={`concrete-airdrop-estimate-${wallet.slice(0, 8)}`}
          stats={[
            {
              label: `At ${formatUsd(fdv)} FDV`,
              value: `≈ $${yourUsdValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}`,
              accent: true,
            },
            { label: "Based on points", value: myPoints.toLocaleString() },
            { label: "Pool share", value: `${(yourShare * 100).toFixed(3)}%` },
          ]}
        />
      </div>
    </section>
  );
}
