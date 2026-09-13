"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { KNOWN_VAULTS } from "@/lib/knownVaults";
import { isAddress } from "viem";

export type FormValues = {
  wallets: string[];
  mode: "manual" | "scan";
  chain: string; // used in manual mode
  chains: string[]; // used in scan mode
  vaults: string; // used in manual mode
};

const STORAGE_KEY = "concrete-tracker:last-form";

// Real vault addresses — Ethereum's is the ctDefiUSDT vault, read directly
// off app.concrete.xyz/earn's own "Live" listing; Arbitrum's is sourced
// from Concrete's own official SDK docs (see lib/knownVaults.ts for the
// full explanation of each). No live vault is currently listed on Base, so
// that field is left blank on purpose rather than guessed — paste your own.
const EXAMPLE_VAULTS: Record<string, string> = {
  ethereum: "0x0e609b710da5e0aa476224b6c0e5445ccc21251e",
  arbitrum: "0xE2d8267D285a7ae1eDf48498fF044241d04e9608",
  base: "",
};

const CHAINS = [
  { key: "ethereum", label: "Ethereum" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "base", label: "Base" },
];

function parseWallets(raw: string): string[] {
  return raw
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
}

export default function WalletForm({
  onSubmit,
  loading,
}: {
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}) {
  const [walletInput, setWalletInput] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [chain, setChain] = useState("ethereum");
  const [chains, setChains] = useState<string[]>(["ethereum", "arbitrum"]);
  const [vaults, setVaults] = useState(EXAMPLE_VAULTS.ethereum);

  // Restore the last-used form on load so you don't have to retype a
  // wallet address every visit. Stored locally in this browser only.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<FormValues> & {
        walletInput?: string;
      };
      if (saved.walletInput) setWalletInput(saved.walletInput);
      if (saved.mode) setMode(saved.mode);
      if (saved.chain) setChain(saved.chain);
      if (saved.chains) setChains(saved.chains);
      if (saved.vaults) setVaults(saved.vaults);
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  function handleChainChange(nextChain: string) {
    setChain(nextChain);
    setVaults(EXAMPLE_VAULTS[nextChain] ?? "");
  }

  function toggleScanChain(key: string) {
    setChains((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;
    setCsvError(null);
    try {
      const text = await file.text();
      // Address-agnostic parsing: pull every 0x-prefixed 40-hex-char token
      // out of the file, regardless of whether it's one-per-line, a CSV
      // column, or has a header row/labels mixed in.
      const matches = text.match(/0x[a-fA-F0-9]{40}/g) ?? [];
      const validAddrs = matches.filter((a) => isAddress(a));
      if (validAddrs.length === 0) {
        setCsvError("No valid wallet addresses found in that file.");
        return;
      }
      const existing = parseWallets(walletInput);
      const merged = Array.from(
        new Set([...existing, ...validAddrs.map((a) => a.toLowerCase())])
      );
      setWalletInput(merged.join(", "));
    } catch {
      setCsvError("Couldn't read that file.");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const values: FormValues = {
      wallets: parseWallets(walletInput),
      mode,
      chain,
      chains,
      vaults,
    };
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ walletInput, mode, chain, chains, vaults })
      );
    } catch {
      // ignore
    }
    onSubmit(values);
  }

  const isCompare = parseWallets(walletInput).length > 1;

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 border border-concreteMuted/40 bg-surface p-6 sm:grid-cols-[2fr_1fr]"
    >
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm text-inkMuted">
          Wallet address{isCompare ? "es (comparing)" : ""}
        </label>
        <input
          required
          value={walletInput}
          onChange={(e) => setWalletInput(e.target.value)}
          placeholder="0x… (comma-separate multiple to compare wallets)"
          className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2.5 font-mono text-sm text-ink placeholder:text-inkMuted/60"
        />
        <div className="mt-1.5 flex items-center gap-2 text-xs text-inkMuted">
          <span>or</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring border border-concreteMuted/40 px-2 py-1 text-inkMuted transition-colors hover:bg-slab"
          >
            Upload CSV of wallets
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleCsvUpload}
            className="hidden"
          />
          {csvError && <span className="text-rust">{csvError}</span>}
        </div>
      </div>

      <div className="sm:col-span-2 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5 text-inkMuted">
          <input
            type="radio"
            checked={mode === "manual"}
            onChange={() => setMode("manual")}
          />
          Paste vault address(es)
        </label>
        <label className="flex items-center gap-1.5 text-inkMuted">
          <input
            type="radio"
            checked={mode === "scan"}
            onChange={() => setMode("scan")}
          />
          Scan known vaults (multi-chain)
        </label>
      </div>

      {mode === "manual" ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm text-inkMuted">Chain</label>
            <select
              value={chain}
              onChange={(e) => handleChainChange(e.target.value)}
              className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2.5 text-sm text-ink"
            >
              {CHAINS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-start-1">
            <label className="mb-1.5 block text-sm text-inkMuted">
              Vault address(es), comma-separated
            </label>
            <input
              required
              value={vaults}
              onChange={(e) => setVaults(e.target.value)}
              placeholder={
                chain === "base"
                  ? "0xabc…, 0xdef… (no example available for Base yet)"
                  : "0xabc…, 0xdef…"
              }
              className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2.5 font-mono text-sm text-ink placeholder:text-inkMuted/60"
            />
            <p className="mt-1.5 text-xs text-inkMuted">
              {EXAMPLE_VAULTS[chain]
                ? "Pre-filled with a live vault address from app.concrete.xyz — replace it with your own vault address(es)."
                : "No example vault on hand for this chain — paste your own vault address(es), copied from app.concrete.xyz via its block explorer link."}
            </p>
          </div>
        </>
      ) : (
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-inkMuted">
            Chains to scan
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            {CHAINS.map((c) => (
              <label
                key={c.key}
                className="flex items-center gap-1.5 text-inkMuted"
              >
                <input
                  type="checkbox"
                  checked={chains.includes(c.key)}
                  onChange={() => toggleScanChain(c.key)}
                  disabled={KNOWN_VAULTS[c.key as keyof typeof KNOWN_VAULTS]?.length === 0}
                />
                {c.label}
                {KNOWN_VAULTS[c.key as keyof typeof KNOWN_VAULTS]?.length === 0 &&
                  " (none known yet)"}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-inkMuted">
            Checks this wallet against a small hand-maintained list of known
            Concrete vault addresses per chain — not full on-chain discovery
            (Concrete doesn&apos;t expose a public vault registry to query
            that against).
          </p>
        </div>
      )}

      <div className="flex items-end sm:col-start-2">
        <button
          type="submit"
          disabled={loading}
          className="focus-ring w-full border border-steel bg-steel/10 px-4 py-2.5 text-sm font-medium text-steelBright transition-colors hover:bg-steel/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Reading chain…" : "Read positions"}
        </button>
      </div>
    </form>
  );
}
