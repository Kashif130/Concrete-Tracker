// A hand-maintained list of known Concrete vault addresses per chain, used
// for the "Scan known vaults" convenience feature, the /vaults live-vaults
// dashboard, and as the pre-filled example in manual mode.
//
// This is NOT true on-chain auto-discovery — Concrete doesn't publicly
// expose a vault registry/subgraph that this tool can query, so there's no
// reliable way to enumerate "every vault a wallet has ever touched"
// on-chain without one. Instead:
//
//  - The 6 Ethereum vaults below were read directly off
//    app.concrete.xyz/earn's own "Live" vault listing (checked 2026-09-13)
//    — each one links out to its block explorer entry from that same page.
//    `referenceApy` / `apyLabel` / `tvlApprox` are that page's own reported
//    figures at the same check date — a snapshot, not a live feed (there is
//    no on-chain APY oracle to read instead).
//  - The 1 Arbitrum vault below is NOT listed on app.concrete.xyz/earn's
//    "Live" section today (only a completed/wound-down Arbitrum campaign is
//    shown there). It's included because it's a genuine, verifiable
//    Concrete ERC-4626 vault contract: it's the exact address Concrete's
//    own official SDK (`@concrete-xyz/sdk`) uses in its published Arbitrum
//    usage examples (chainId 42161). Since this tool only *reads* on-chain
//    data, an address being deposit-gated or not front-and-center on the
//    Earn page doesn't stop it from working here — but there's no published
//    APY for it, so `referenceApy` is left unset rather than guessed.
//
// A few vaults shown on the Earn page are excluded on purpose:
//  - "WeETH Vault" and "WLFIcx" are marked private/permission-required and
//    app.concrete.xyz doesn't surface a public vault address for either,
//    so there's nothing verifiable to add here.
//  - Vaults curated by Royco (Senior Royco USDC, Royco ETH) ARE included
//    below since Concrete's own Earn page lists their addresses directly,
//    but note deposits for those route through dawn.royco.org, not
//    Concrete's own UI.
//
// If Concrete lists a new live vault on Base (or another Arbitrum vault),
// paste its address in manual mode and it'll work immediately — this list
// is just a convenience, not a requirement.
import type { ChainKey } from "./chains";

export type VaultInfo = {
  address: string;
  label: string;
  note?: string;
  /** Reported APY at time of writing (see file header) — a snapshot, never fetched live. Fraction, e.g. 0.0819 for 8.19%. */
  referenceApy?: number;
  /** What kind of APY figure referenceApy is (Concrete reports different bases per vault). */
  apyLabel?: string;
  /** Approx TVL in the vault's own underlying units at time of writing, purely descriptive. */
  tvlApprox?: string;
  curator?: string;
  permissionRequired?: boolean;
  /** Where to actually deposit, if not app.concrete.xyz/earn directly (e.g. Royco-curated vaults). */
  depositUrl?: string;
};

export const KNOWN_VAULT_INFO: Record<ChainKey, VaultInfo[]> = {
  ethereum: [
    {
      address: "0x0e609b710da5e0aa476224b6c0e5445ccc21251e",
      label: "Concrete DeFi USDT (ctDefiUSDT)",
      referenceApy: 0.0819,
      apyLabel: "Live APY",
      tvlApprox: "$29.8M",
      curator: "Concrete",
    },
    {
      address: "0xf72bd5a56de97840f1fdd3641b556126c10aa1c4",
      label: "WBTC Vault (ctWBTC)",
      referenceApy: 0.0173,
      apyLabel: "Live APY",
      tvlApprox: "$2.27M",
      curator: "Concrete",
    },
    {
      address: "0xe72d4cc29285e33a1bd3f2a5e433256378ebfb88",
      label: "Concrete Frontier (USDC)",
      note: "Permission required on app.concrete.xyz to deposit.",
      referenceApy: 0.0738,
      apyLabel: "Live APY",
      tvlApprox: "$1.19M",
      curator: "Concrete",
      permissionRequired: true,
    },
    {
      address: "0x86a95dc16d05c62a6c22fa1697ca933ecca380b7",
      label: "RWA USD1",
      note: "Permission required on app.concrete.xyz to deposit.",
      referenceApy: 0.08,
      apyLabel: "Target APY",
      tvlApprox: "$25M",
      curator: "Concrete",
      permissionRequired: true,
    },
    {
      address: "0xcd9f5907f92818bc06c9ad70217f089e190d2a32",
      label: "Senior Royco USDC (srRoyUSDC)",
      note: "Curated by Royco — deposits happen via dawn.royco.org.",
      referenceApy: 0.0567,
      apyLabel: "30-day APY",
      tvlApprox: "$9.07M",
      curator: "Royco",
      depositUrl: "https://dawn.royco.org/vault/1/0xcd9f5907f92818bc06c9ad70217f089e190d2a32",
    },
    {
      address: "0x41ce72e04d349eb957bdc373baa9c69207032c56",
      label: "Royco ETH (roywstETH)",
      note: "Curated by Royco — deposits happen via dawn.royco.org.",
      referenceApy: 0.0205,
      apyLabel: "30-day APY",
      tvlApprox: "$292K",
      curator: "Royco",
      depositUrl: "https://dawn.royco.org/vault/1/0x41Ce72E04D349Eb957bdc373baA9c69207032c56",
    },
  ],
  arbitrum: [
    {
      address: "0xE2d8267D285a7ae1eDf48498fF044241d04e9608",
      label: "Concrete Vault (Arbitrum)",
      note:
        "Not shown on app.concrete.xyz/earn's current Live listing — sourced from Concrete's own official SDK docs/examples (@concrete-xyz/sdk, chainId 42161). Name/symbol/TVL below are read live on-chain; no published APY exists for this one, so none is shown. Verify independently before relying on it.",
      curator: "Concrete",
    },
  ],
  base: [],
};

export const KNOWN_VAULTS: Record<ChainKey, string[]> = Object.fromEntries(
  Object.entries(KNOWN_VAULT_INFO).map(([chain, vaults]) => [
    chain,
    vaults.map((v) => v.address),
  ])
) as Record<ChainKey, string[]>;
