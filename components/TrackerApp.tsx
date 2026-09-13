"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WalletForm, { FormValues } from "@/components/WalletForm";
import VaultPanel from "@/components/VaultPanel";
import PointsPanel from "@/components/PointsPanel";
import AirdropEstimator from "@/components/AirdropEstimator";
import ThemeToggle from "@/components/ThemeToggle";
import AutoRefreshControl from "@/components/AutoRefreshControl";
import EnsAddress from "@/components/EnsAddress";
import { KNOWN_VAULTS } from "@/lib/knownVaults";
import { parsePoints } from "@/lib/points";
import { walletProfileUrl } from "@/lib/siteConfig";
import type { ChainKey } from "@/lib/chains";

type WalletResult = {
  wallet: string;
  vaultData: { vaults: any[]; warnings?: string[] };
  pointsData: any;
};

export default function TrackerApp({
  initialWallet,
}: {
  initialWallet?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletResults, setWalletResults] = useState<WalletResult[]>([]);
  const [lastValues, setLastValues] = useState<FormValues | null>(null);

  async function handleSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    setLastValues(values);

    if (values.wallets.length === 0) {
      setError("Enter at least one wallet address.");
      setLoading(false);
      return;
    }

    let chainQueries: { chain: string; vaults: string[] }[] = [];
    if (values.mode === "manual") {
      const vaultAddrs = values.vaults
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (vaultAddrs.length === 0) {
        setError("Provide at least one vault address, or switch to scan mode.");
        setLoading(false);
        return;
      }
      chainQueries = [{ chain: values.chain, vaults: vaultAddrs }];
    } else {
      chainQueries = values.chains
        .map((c) => ({
          chain: c,
          vaults: KNOWN_VAULTS[c as ChainKey] ?? [],
        }))
        .filter((q) => q.vaults.length > 0);
      if (chainQueries.length === 0) {
        setError("Select at least one chain that has known vaults to scan.");
        setLoading(false);
        return;
      }
    }

    try {
      const perWallet = await Promise.all(
        values.wallets.map(async (wallet, idx) => {
          const vaultResponses = await Promise.all(
            chainQueries.map(async (q) => {
              const params = new URLSearchParams({
                wallet,
                chain: q.chain,
                vaults: q.vaults.join(","),
                _t: Date.now().toString(),
              });
              const res = await fetch(`/api/vault?${params.toString()}`, {
                cache: "no-store",
              });
              const json = await res.json();
              return { chain: q.chain, ok: res.ok, json };
            })
          );

          const mergedVaults = vaultResponses.flatMap((r) =>
            r.ok
              ? r.json.vaults.map((v: any) => ({ ...v, chain: r.chain }))
              : []
          );
          const mergedWarnings = vaultResponses.flatMap(
            (r) => r.json.warnings ?? []
          );
          const vaultErrors = vaultResponses
            .filter((r) => !r.ok)
            .map((r) => `[${r.chain}] ${r.json.error}`);

          const pointsRes = await fetch(
            `/api/points?wallet=${wallet}${
              idx === 0 ? "&leaderboard=1" : ""
            }&_t=${Date.now()}`,
            { cache: "no-store" }
          );
          const pointsJson = await pointsRes.json();

          return {
            wallet,
            vaultData: {
              vaults: mergedVaults,
              warnings: mergedWarnings.length ? mergedWarnings : undefined,
            },
            pointsData: pointsJson,
            vaultErrors,
          };
        })
      );

      setWalletResults(perWallet);
      const allErrors = perWallet.flatMap((r) => r.vaultErrors);
      setError(allErrors.length > 0 ? allErrors.join(" · ") : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Public profile mode: auto-run a scan-all-chains query for the wallet
  // baked into the URL, no form fill needed.
  useEffect(() => {
    if (initialWallet) {
      const allChains = Object.keys(KNOWN_VAULTS) as ChainKey[];
      handleSubmit({
        wallets: [initialWallet],
        mode: "scan",
        chain: "ethereum",
        chains: allChains,
        vaults: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWallet]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs text-steelBright">
            concrete.xyz · app.concrete.xyz · points.concrete.xyz
          </p>
          <h1 className="text-3xl text-ink sm:text-4xl">
            {initialWallet ? "Public Position Profile 🗿" : "Position Ledger"}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-inkMuted">
            {initialWallet ? (
              <>
                Live Concrete vault positions and points for{" "}
                <EnsAddress address={initialWallet} className="font-mono" />.
              </>
            ) : (
              <>
                Enter one or more wallets and read Concrete vault positions
                and points balance side by side — pulled live, not cached.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vaults"
            className="focus-ring border border-brass/40 bg-brass/10 px-3 py-1.5 text-xs text-brass transition-colors hover:bg-brass/20"
          >
            Live Vaults ↗
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {!initialWallet && <WalletForm onSubmit={handleSubmit} loading={loading} />}

      {loading && initialWallet && (
        <p className="border border-concreteMuted/40 bg-surface px-4 py-3 text-sm text-inkMuted">
          Reading chain…
        </p>
      )}

      {error && (
        <p className="mt-4 border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-rust">
          {error}
        </p>
      )}

      {walletResults.length > 0 && !initialWallet && (
        <div className="mt-4 flex justify-end">
          <AutoRefreshControl
            disabled={!lastValues || loading}
            onRefresh={() => lastValues && handleSubmit(lastValues)}
          />
        </div>
      )}

      {walletResults.length > 0 && (
        <div className="mt-4 space-y-10">
          {walletResults.map((r) => (
            <div key={r.wallet} className="space-y-6">
              {(walletResults.length > 1 || initialWallet) && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-mono text-sm text-steelBright">
                    <EnsAddress address={r.wallet} />
                  </h3>
                  {!initialWallet && (
                    <a
                      href={walletProfileUrl(r.wallet)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring border border-concreteMuted/40 px-2 py-1 text-xs text-inkMuted transition-colors hover:bg-slab"
                    >
                      Public profile link ↗
                    </a>
                  )}
                </div>
              )}
              <VaultPanel
                vaults={r.vaultData.vaults}
                warnings={r.vaultData.warnings}
                wallet={r.wallet}
                walletLabel={
                  walletResults.length > 1
                    ? `${r.wallet.slice(0, 6)}…${r.wallet.slice(-4)}`
                    : undefined
                }
                pointsData={
                  r.pointsData?.status === "ok"
                    ? parsePoints(r.pointsData.totals)
                    : null
                }
              />
              <PointsPanel data={r.pointsData} />
              <AirdropEstimator
                wallet={r.wallet}
                yourPoints={
                  r.pointsData?.status === "ok"
                    ? parsePoints(r.pointsData.totals)?.totalAmount ?? null
                    : null
                }
              />
            </div>
          ))}
        </div>
      )}

      <footer className="mt-16 border-t border-concreteMuted/30 pt-6 text-xs text-inkMuted">
        Independent, third-party tool. Not built or endorsed by Blueprint
        Finance. Vault reads come directly from each chain via public RPCs;
        verify anything financially material against app.concrete.xyz
        yourself. · Built by Concrete Tracker 🗿
      </footer>
    </main>
  );
}
