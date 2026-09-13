"use client";

import { useEffect, useState } from "react";
import ShareButtons from "./ShareButtons";
import ShareCardImage from "./ShareCardImage";
import Sparkline from "./Sparkline";
import { recordSnapshot, getHistory, type Snapshot } from "@/lib/snapshots";
import { parsePoints, type ParsedPoints } from "@/lib/points";
import { SITE_URL } from "@/lib/siteConfig";

type PointsResponse = {
  wallet: string;
  status: "ok" | "not_configured" | "error";
  totals?: unknown;
  leaderboard?: unknown;
  leaderboardError?: string;
  message?: string;
};

type LeaderboardRow = {
  rank: number | null;
  total_amount: number | null;
  address: string | null;
};

// The Fuul leaderboard response shape is `{ results: [{ total_amount, rank,
// total_attributions, ... }], calculated_at }`. Parsed defensively since
// it's a third-party API and not something this app controls the shape of.

function parseLeaderboard(data: unknown): LeaderboardRow[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const results = Array.isArray(obj.results) ? obj.results : [];
  return results.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      rank: typeof row.rank === "number" ? row.rank : null,
      total_amount:
        typeof row.total_amount === "number" ? row.total_amount : null,
      address: typeof row.address === "string" ? row.address : null,
    };
  });
}

function buildShareText(wallet: string, parsed: ParsedPoints): string {
  const lines = ["My Concrete points balance 🏗️🗿"];
  if (parsed.totalAmount !== null) {
    lines.push(`Points: ${parsed.totalAmount.toLocaleString()}`);
  }
  if (parsed.rank !== null) {
    lines.push(`Rank: #${parsed.rank.toLocaleString()}`);
  }
  if (parsed.totalAttributions !== null) {
    lines.push(`Attributions: ${parsed.totalAttributions}`);
  }
  lines.push(`Wallet: ${wallet.slice(0, 6)}…${wallet.slice(-4)}`);
  lines.push(`via ${SITE_URL} · points.concrete.xyz`);
  return lines.join("\n");
}

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

function crossedMilestone(prev: number, next: number): number | null {
  for (const m of MILESTONES) {
    if (prev < m && next >= m) return m;
  }
  return null;
}

export default function PointsPanel({ data }: { data: PointsResponse }) {
  const parsed = data.status === "ok" ? parsePoints(data.totals) : null;
  const shareText = parsed ? buildShareText(data.wallet, parsed) : null;
  const leaderboard = parseLeaderboard(data.leaderboard);

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (parsed?.totalAmount == null) return;
    const key = `points:${data.wallet.toLowerCase()}`;
    const prevHistory = getHistory(key);
    const prevValue = prevHistory[prevHistory.length - 1]?.v;
    const updated = recordSnapshot(key, parsed.totalAmount);
    setHistory(updated);
    if (prevValue !== undefined) {
      setMilestone(crossedMilestone(prevValue, parsed.totalAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.wallet, parsed?.totalAmount]);

  return (
    <section className="border border-concreteMuted/40 bg-surface">
      <header className="border-b border-concreteMuted/40 px-6 py-4">
        <h2 className="text-lg text-ink">Points balance</h2>
        <p className="text-xs text-inkMuted">
          Sourced from Fuul, the incentive platform behind points.concrete.xyz.
        </p>
      </header>

      <div className="px-6 py-5">
        {milestone !== null && (
          <p className="mb-4 border border-brass/50 bg-brass/10 px-3 py-2 text-sm text-brass">
            🎉 You just crossed {milestone.toLocaleString()} points!
          </p>
        )}

        {data.status === "ok" && parsed && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-inkMuted">
                Points
              </div>
              <div className="font-mono text-xl text-brass">
                {parsed.totalAmount?.toLocaleString() ?? "—"}
              </div>
              {history.length > 1 && (
                <Sparkline points={history} color="rgb(var(--color-brass))" />
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-inkMuted">
                Rank
              </div>
              <div className="font-mono text-xl text-ink">
                {parsed.rank !== null ? `#${parsed.rank.toLocaleString()}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-inkMuted">
                Attributions
              </div>
              <div className="font-mono text-xl text-ink">
                {parsed.totalAttributions ?? "—"}
              </div>
            </div>
          </div>
        )}

        {history.length > 1 && (
          <p className="mt-2 text-xs text-inkMuted">
            Trend is built from your own visits in this browser, not
            server-tracked history.
          </p>
        )}

        {leaderboard.length > 0 && (
          <div className="mt-5 border-t border-concreteMuted/30 pt-4">
            <div className="mb-2 text-xs uppercase tracking-wide text-inkMuted">
              Leaderboard (top {leaderboard.length})
            </div>
            <div className="space-y-1 font-mono text-xs text-inkMuted">
              {leaderboard.map((row, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span>
                    #{row.rank ?? i + 1}{" "}
                    {row.address
                      ? `${row.address.slice(0, 6)}…${row.address.slice(-4)}`
                      : "—"}
                  </span>
                  <span className="text-brass">
                    {row.total_amount?.toLocaleString() ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.leaderboardError && (
          <p className="mt-3 text-xs text-inkMuted">
            Leaderboard unavailable: {data.leaderboardError}
          </p>
        )}

        {data.status === "ok" && (
          <details className="mt-4 text-xs text-inkMuted">
            <summary className="cursor-pointer select-none">
              Raw response
            </summary>
            <pre className="mt-2 overflow-x-auto font-mono text-xs text-inkMuted/80">
              {JSON.stringify(data.totals, null, 2)}
            </pre>
          </details>
        )}

        {data.status === "ok" && shareText && (
          <>
            <ShareButtons text={shareText} />
            {parsed && parsed.totalAmount !== null && (
              <ShareCardImage
                kicker="concrete.xyz · Points"
                headline={parsed.totalAmount.toLocaleString()}
                headlineLabel="Points"
                wallet={data.wallet}
                filename={`concrete-points-${data.wallet.slice(0, 8)}`}
                stats={[
                  parsed.rank !== null
                    ? { label: "Rank", value: `#${parsed.rank.toLocaleString()}` }
                    : null,
                  parsed.totalAttributions !== null
                    ? {
                        label: "Attributions",
                        value: String(parsed.totalAttributions),
                      }
                    : null,
                ].filter((s): s is { label: string; value: string } => s !== null)}
              />
            )}
          </>
        )}

        {data.status === "not_configured" && (
          <div className="space-y-2 text-sm">
            <p className="text-inkMuted">
              Points aren&apos;t wired up yet — this tool needs a Fuul
              read-only API key for Concrete&apos;s project, set as{" "}
              <code className="font-mono text-steelBright">FUUL_API_KEY</code>{" "}
              in your environment.
            </p>
            <p className="text-inkMuted">
              Get one by asking Blueprint Finance for read-only access, or by
              opening points.concrete.xyz, watching the Network tab for its
              calls to <code className="font-mono">api.fuul.xyz</code>, and
              copying the bearer key from there — it&apos;s a front-end-safe,
              read-only key. See README.md.
            </p>
          </div>
        )}

        {data.status === "error" && (
          <p className="font-mono text-sm text-rust">{data.message}</p>
        )}
      </div>
    </section>
  );
}
