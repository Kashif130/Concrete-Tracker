import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { getPublicClient, type ChainKey } from "@/lib/chains";
import { erc4626Abi, erc20MetadataAbi } from "@/lib/erc4626Abi";
import { formatUnits } from "@/lib/units";
import { KNOWN_VAULT_INFO, type VaultInfo } from "@/lib/knownVaults";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export type LiveVaultResult = VaultInfo & {
  chain: ChainKey;
  name: string | null;
  symbol: string | null;
  underlyingSymbol: string | null;
  totalAssetsFormatted: string | null;
  sharePrice: number | null;
  blockNumber: string | null;
  error?: string;
};

// Powers the /vaults dashboard: every vault in lib/knownVaults.ts, read
// live on-chain (name, symbol, TVL, share price) with no wallet address
// needed. This is intentionally read-only, aggregate data — for a specific
// wallet's position, use /api/vault.
export async function GET() {
  const chainKeys = Object.keys(KNOWN_VAULT_INFO) as ChainKey[];

  const perChain = await Promise.all(
    chainKeys.map(async (chainKey) => {
      const vaults = KNOWN_VAULT_INFO[chainKey];
      if (vaults.length === 0) {
        return { chain: chainKey, blockNumber: null, results: [] as LiveVaultResult[] };
      }

      const client = getPublicClient(chainKey);
      const blockNumber = await client.getBlockNumber().catch(() => null);
      const blockTagOpt = blockNumber !== null ? { blockNumber } : {};

      const results = await Promise.all(
        vaults.map(async (info): Promise<LiveVaultResult> => {
          try {
            const vault = getAddress(info.address);

            const [name, symbol, decimals, assetAddress, totalAssets, totalSupply] =
              await Promise.all([
                client
                  .readContract({ address: vault, abi: erc4626Abi, functionName: "name", ...blockTagOpt })
                  .catch(() => null),
                client
                  .readContract({ address: vault, abi: erc4626Abi, functionName: "symbol", ...blockTagOpt })
                  .catch(() => null),
                client.readContract({ address: vault, abi: erc4626Abi, functionName: "decimals", ...blockTagOpt }),
                client
                  .readContract({ address: vault, abi: erc4626Abi, functionName: "asset", ...blockTagOpt })
                  .catch(() => null),
                client
                  .readContract({ address: vault, abi: erc4626Abi, functionName: "totalAssets", ...blockTagOpt })
                  .catch(() => null),
                client
                  .readContract({ address: vault, abi: erc4626Abi, functionName: "totalSupply", ...blockTagOpt })
                  .catch(() => null),
              ]);

            let underlyingSymbol: string | null = null;
            let underlyingDecimals = decimals;
            if (assetAddress) {
              try {
                [underlyingSymbol, underlyingDecimals] = await Promise.all([
                  client.readContract({ address: assetAddress, abi: erc20MetadataAbi, functionName: "symbol", ...blockTagOpt }),
                  client.readContract({ address: assetAddress, abi: erc20MetadataAbi, functionName: "decimals", ...blockTagOpt }),
                ]);
              } catch {
                // best-effort
              }
            }

            let sharePrice: number | null = null;
            if (totalAssets !== null && totalSupply !== null && totalSupply > 0n) {
              sharePrice =
                Number(formatUnits(totalAssets, underlyingDecimals)) /
                Number(formatUnits(totalSupply, decimals));
            }

            return {
              ...info,
              address: vault,
              chain: chainKey,
              name,
              symbol,
              underlyingSymbol,
              totalAssetsFormatted: totalAssets !== null ? formatUnits(totalAssets, underlyingDecimals) : null,
              sharePrice,
              blockNumber: blockNumber !== null ? blockNumber.toString() : null,
            };
          } catch (err) {
            return {
              ...info,
              chain: chainKey,
              name: null,
              symbol: null,
              underlyingSymbol: null,
              totalAssetsFormatted: null,
              sharePrice: null,
              blockNumber: blockNumber !== null ? blockNumber.toString() : null,
              error:
                err instanceof Error
                  ? err.message
                  : "This address doesn't expose the ERC-4626 interface on this chain.",
            };
          }
        })
      );

      return { chain: chainKey, blockNumber: blockNumber !== null ? blockNumber.toString() : null, results };
    })
  );

  const vaults = perChain.flatMap((c) => c.results);

  return NextResponse.json(
    {
      fetchedAt: new Date().toISOString(),
      chains: perChain.map((c) => ({ chain: c.chain, blockNumber: c.blockNumber })),
      vaults,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
