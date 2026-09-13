import { mainnet, arbitrum, base } from "viem/chains";
import { createPublicClient, fallback, http } from "viem";
import type { Chain } from "viem";

export const SUPPORTED_CHAINS: Record<string, Chain> = {
  ethereum: mainnet,
  arbitrum: arbitrum,
  base: base,
};

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

export function isChainKey(value: string): value is ChainKey {
  return value in SUPPORTED_CHAINS;
}

// Optional per-chain RPC overrides — if you set one of these, it's used
// exclusively (see getPublicClient below).
const RPC_ENV_VAR: Record<ChainKey, string> = {
  ethereum: "ETHEREUM_RPC_URL",
  arbitrum: "ARBITRUM_RPC_URL",
  base: "BASE_RPC_URL",
};

// When no dedicated RPC env var is set, don't rely on a single shared
// public endpoint (viem/chains' built-in default) — that's the #1 cause of
// "vault position isn't working" / "Arbitrum looks wrong or empty" reports,
// since that one endpoint is rate-limited across every app using it.
// Instead, fan out across several independent public RPCs and let viem's
// `fallback()` transport retry the next one on error or timeout. This is
// still a public, best-effort RPC (a dedicated key from Alchemy/Infura/Ankr
// via the env vars above is more reliable for heavy use), but it means one
// congested provider no longer takes the whole feature down.
const FALLBACK_RPC_URLS: Record<ChainKey, string[]> = {
  ethereum: [
    "https://ethereum-rpc.publicnode.com",
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
  ],
  arbitrum: [
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arb1.arbitrum.io/rpc",
    "https://rpc.ankr.com/arbitrum",
    "https://arbitrum.llamarpc.com",
  ],
  base: [
    "https://base-rpc.publicnode.com",
    "https://mainnet.base.org",
    "https://rpc.ankr.com/base",
    "https://base.llamarpc.com",
  ],
};

export function getPublicClient(chainKey: ChainKey) {
  const chain = SUPPORTED_CHAINS[chainKey];
  const overrideUrl = process.env[RPC_ENV_VAR[chainKey]];

  const transport = overrideUrl
    ? http(overrideUrl, { batch: false })
    : fallback(
        FALLBACK_RPC_URLS[chainKey].map((url) =>
          http(url, {
            batch: false,
            timeout: 8_000,
            retryCount: 1,
          })
        ),
        // Re-check the earlier (preferred) transports periodically instead
        // of sticking with whichever one happened to answer first.
        { rank: false }
      );

  return createPublicClient({
    chain,
    transport,
    // Disable viem's internal client-level response cache so repeated
    // reads with the same shape can't be served from viem's own cache
    // instead of hitting the chain again.
    cacheTime: 0,
  });
}

// ENS only resolves against Ethereum mainnet, regardless of which chain a
// given wallet's vault position lives on — so this is a separate,
// always-mainnet client used purely for reverse address -> name lookups.
let ensClient: ReturnType<typeof createPublicClient> | null = null;
export function getEnsClient() {
  if (!ensClient) {
    ensClient = createPublicClient({
      chain: SUPPORTED_CHAINS.ethereum,
      transport: process.env.ETHEREUM_RPC_URL
        ? http(process.env.ETHEREUM_RPC_URL)
        : fallback(
            FALLBACK_RPC_URLS.ethereum.map((url) => http(url, { timeout: 8_000 }))
          ),
    });
  }
  return ensClient;
}
