"use client";

import { useEffect, useState } from "react";
import ShareButtons from "./ShareButtons";
import ShareCardImage from "./ShareCardImage";
import Sparkline from "./Sparkline";
import PortfolioTotal from "./PortfolioTotal";
import ExportButtons from "./ExportButtons";
import QrCode from "./QrCode";
import AlertSetup from "./AlertSetup";
import { useEnsName } from "./EnsAddress";
import { recordSnapshot, getHistory, estimateApy, type Snapshot } from "@/lib/snapshots";
import { SITE_URL, walletProfileUrl } from "@/lib/siteConfig";

type VaultResult = {
  vaultAddress: string;
  name: string | null;
  symbol: string | null;
  underlyingSymbol: string | null;
  sharesHeldFormatted: string;
  underlyingValueFormatted: string;
  totalAssetsFormatted: string;
  sharePrice: number | null;
  blockNumber?: string | null;
  chain?: string;
  error?: string;
};

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function round(value: string, places = 6) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString(undefined, { maximumFractionDigits: places });
}

function buildShareText(v: VaultResult): string {
  const lines = [
    `My position in ${v.name ?? "a Concrete vault"}${
      v.symbol ? ` (${v.symbol})` : ""
    } 🏗️🗿`,
    `${round(v.underlyingValueFormatted)} ${v.underlyingSymbol ?? ""}`.trim(),
  ];
  if (v.sharePrice !== null) {
    lines.push(`Share price: ${v.sharePrice.toFixed(6)}`);
  }
  if (v.chain) lines.push(`Chain: ${v.chain}`);
  lines.push(`Vault: ${truncate(v.vaultAddress)}`);
  lines.push(`via ${SITE_URL} · app.concrete.xyz`);
  return lines.join("\n");
}

/** % change between the previous recorded visit and the value just read, or null if there's no prior visit to compare against. */
function usePositionDiff(key: string, value: number | null) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (value == null) return;
    const prevHistory = getHistory(key);
    const prevValue = prevHistory[prevHistory.length - 1]?.v;
    if (prevValue !== undefined && prevValue !== 0) {
      setDiff(((value - prevValue) / prevValue) * 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return diff;
}

function VaultRow({ v }: { v: VaultResult }) {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const positionKey = `position:${v.vaultAddress.toLowerCase()}`;
  const positionValue = v.error ? null : Number(v.underlyingValueFormatted);
  const positionDiff = usePositionDiff(
    positionKey,
    Number.isNaN(positionValue) ? null : positionValue
  );

  useEffect(() => {
    if (v.sharePrice == null) return;
    const key = `sharePrice:${v.vaultAddress.toLowerCase()}`;
    setHistory(recordSnapshot(key, v.sharePrice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.vaultAddress, v.sharePrice]);

  useEffect(() => {
    setHistory(getHistory(`sharePrice:${v.vaultAddress.toLowerCase()}`));
  }, [v.vaultAddress]);

  // Record the position (underlying value) snapshot too, so "since last
  // visit" has something to diff against on the next load. Recorded after
  // usePositionDiff reads the prior value, so this visit doesn't diff
  // against itself.
  useEffect(() => {
    if (positionValue == null || Number.isNaN(positionValue)) return;
    recordSnapshot(positionKey, positionValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey, positionValue]);

  const apy = estimateApy(history);

  return (
    <div className="grid gap-3 px-6 py-5 sm:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div>
        <div className="text-sm text-ink">
          {v.name ?? "Unnamed vault"}{" "}
          {v.symbol && <span className="text-inkMuted">({v.symbol})</span>}
        </div>
        <div className="font-mono text-xs text-inkMuted" title={v.vaultAddress}>
          {truncate(v.vaultAddress)}
          {v.chain && (
            <span className="ml-2 border border-concreteMuted/40 px-1 text-[10px] uppercase text-inkMuted">
              {v.chain}
            </span>
          )}
        </div>
        {v.blockNumber && (
          <div className="mt-1 font-mono text-[10px] text-inkMuted/70">
            block #{v.blockNumber}
          </div>
        )}
      </div>

      {v.error ? (
        <div className="sm:col-span-3 font-mono text-xs text-rust">
          {v.error}
        </div>
      ) : (
        <>
          <div>
            <div className="text-xs uppercase tracking-wide text-inkMuted">
              Your position
            </div>
            <div className="font-mono text-sm text-brass">
              {round(v.underlyingValueFormatted)} {v.underlyingSymbol ?? ""}
            </div>
            <div className="font-mono text-xs text-inkMuted">
              {round(v.sharesHeldFormatted)} shares
            </div>
            {positionDiff !== null && (
              <div
                className={`mt-1 font-mono text-[11px] ${
                  positionDiff >= 0 ? "text-brass" : "text-rust"
                }`}
              >
                {positionDiff >= 0 ? "+" : ""}
                {positionDiff.toFixed(2)}% since last visit
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-inkMuted">
              Vault TVL
            </div>
            <div className="font-mono text-sm text-ink">
              {round(v.totalAssetsFormatted)} {v.underlyingSymbol ?? ""}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-inkMuted">
              Share price
            </div>
            <div className="font-mono text-sm text-ink">
              {v.sharePrice !== null ? v.sharePrice.toFixed(6) : "—"}
            </div>
            {history.length > 1 && <Sparkline points={history} />}
            {apy !== null && (
              <div className="mt-1 font-mono text-[11px] text-inkMuted">
                ~{(apy * 100).toFixed(1)}% annualized (from your own visit
                history, rough estimate)
              </div>
            )}
            <ShareButtons text={buildShareText(v)} />
          </div>
        </>
      )}
    </div>
  );
}

export default function VaultPanel({
  vaults,
  warnings,
  walletLabel,
  wallet,
  pointsData,
}: {
  vaults: VaultResult[];
  warnings?: string[];
  walletLabel?: string;
  wallet?: string;
  pointsData?: {
    totalAmount: number | null;
    rank: number | null;
    totalAttributions: number | null;
  } | null;
}) {
  const okVaults = vaults.filter((v) => !v.error);
  const topHolding = [...okVaults].sort(
    (a, b) => Number(b.underlyingValueFormatted) - Number(a.underlyingValueFormatted)
  )[0];
  const ensName = useEnsName(wallet);

  return (
    <>
    <section className="border border-concreteMuted/40 bg-surface">
      <header className="border-b border-concreteMuted/40 px-6 py-4">
        <h2 className="text-lg text-ink">
          Vault positions{walletLabel ? ` — ${walletLabel}` : ""}
        </h2>
        <p className="text-xs text-inkMuted">
          Read live from each vault&apos;s ERC-4626 interface — no indexer,
          no cache.
        </p>
      </header>

      {warnings && warnings.length > 0 && (
        <div className="space-y-1 border-b border-rust/40 bg-rust/10 px-6 py-3">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-rust">
              {w}
            </p>
          ))}
        </div>
      )}

      <PortfolioTotal vaults={okVaults} />

      <div className="divide-y divide-concreteMuted/30">
        {vaults.map((v) => (
          <VaultRow key={`${v.chain ?? ""}-${v.vaultAddress}`} v={v} />
        ))}
      </div>

      {okVaults.length > 0 && topHolding && (
        <div className="border-t border-concreteMuted/30 px-6 py-4">
          <ShareCardImage
            kicker="concrete.xyz · Positions"
            headline={`${round(topHolding.underlyingValueFormatted)} ${
              topHolding.underlyingSymbol ?? ""
            }`.trim()}
            headlineLabel={topHolding.name ?? "Vault position"}
            wallet={wallet}
            filename="concrete-positions"
            stats={okVaults
              .filter((v) => v.vaultAddress !== topHolding.vaultAddress)
              .slice(0, 3)
              .map((v) => ({
                label: v.name ?? truncate(v.vaultAddress),
                value: `${round(v.underlyingValueFormatted)} ${
                  v.underlyingSymbol ?? ""
                }`.trim(),
              }))}
          />
        </div>
      )}

      {wallet && (
        <div className="flex flex-col gap-4 border-t border-concreteMuted/30 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-inkMuted">
              Export &amp; share
            </div>
            <ExportButtons
              wallet={wallet}
              ensName={ensName}
              vaults={okVaults}
              points={pointsData ?? null}
            />
            <a
              href={walletProfileUrl(wallet)}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-xs text-steelBright underline"
            >
              {walletProfileUrl(wallet)}
            </a>
          </div>
          <QrCode
            url={walletProfileUrl(wallet)}
            size={120}
            label="Scan to open this wallet's public position page"
          />
        </div>
      )}
    </section>
    {okVaults.length > 0 && (
      <div className="mt-6">
        <AlertSetup vaults={okVaults} />
      </div>
    )}
    </>
  );
}
