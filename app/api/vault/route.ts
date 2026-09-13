import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { getPublicClient, isChainKey } from "@/lib/chains";
import { erc4626Abi, erc20MetadataAbi } from "@/lib/erc4626Abi";
import { formatUnits } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type VaultResult = {
  vaultAddress: string;
  name: string | null;
  symbol: string | null;
  underlyingSymbol: string | null;
  sharesHeld: string;
  sharesHeldFormatted: string;
  underlyingValue: string;
  underlyingValueFormatted: string;
  totalAssetsFormatted: string;
  sharePrice: number | null;
  decimals: number;
  blockNumber: string | null;
  error?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const chainParam = searchParams.get("chain") ?? "ethereum";
  const vaultsParam = searchParams.get("vaults") ?? "";

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: "A valid `wallet` address query param is required." },
      { status: 400 }
    );
  }

  if (!isChainKey(chainParam)) {
    return NextResponse.json(
      { error: `Unsupported chain "${chainParam}".` },
      { status: 400 }
    );
  }

  const rawVaultAddresses = vaultsParam
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  if (rawVaultAddresses.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one vault address via `vaults`." },
      { status: 400 }
    );
  }

  const invalid = rawVaultAddresses.filter((a) => !isAddress(a));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Invalid vault address(es): ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  // Checksum + de-duplicate. If the same vault was pasted twice (even with
  // different casing or stray whitespace), it's not a chain-reading bug —
  // flag it explicitly instead of silently returning "identical" rows.
  const seen = new Map<string, string>(); // lowercase -> original input
  const duplicatesOf: Record<string, string[]> = {};
  for (const addr of rawVaultAddresses) {
    const key = addr.toLowerCase();
    if (seen.has(key)) {
      duplicatesOf[key] = duplicatesOf[key] ?? [seen.get(key)!];
      duplicatesOf[key].push(addr);
    } else {
      seen.set(key, addr);
    }
  }
  const vaultAddresses = Array.from(seen.values());

  const client = getPublicClient(chainParam);

  // Pin every read in this request to the same block number, fetched once.
  // Beyond consistency, returning it lets you directly verify in the
  // response that each vault's numbers came from an independent read
  // rather than a cached/stale one.
  const blockNumber = await client.getBlockNumber().catch(() => null);
  const blockTagOpt = blockNumber !== null ? { blockNumber } : {};

  const results: VaultResult[] = await Promise.all(
    vaultAddresses.map(async (vaultAddress) => {
      try {
        const vault = getAddress(vaultAddress);
        const account = getAddress(wallet);

        const [name, symbol, decimals, assetAddress, shares, totalAssets] =
          await Promise.all([
            client
              .readContract({
                address: vault,
                abi: erc4626Abi,
                functionName: "name",
                ...blockTagOpt,
              })
              .catch(() => null),
            client
              .readContract({
                address: vault,
                abi: erc4626Abi,
                functionName: "symbol",
                ...blockTagOpt,
              })
              .catch(() => null),
            client.readContract({
              address: vault,
              abi: erc4626Abi,
              functionName: "decimals",
              ...blockTagOpt,
            }),
            client
              .readContract({
                address: vault,
                abi: erc4626Abi,
                functionName: "asset",
                ...blockTagOpt,
              })
              .catch(() => null),
            client.readContract({
              address: vault,
              abi: erc4626Abi,
              functionName: "balanceOf",
              args: [account],
              ...blockTagOpt,
            }),
            client
              .readContract({
                address: vault,
                abi: erc4626Abi,
                functionName: "totalAssets",
                ...blockTagOpt,
              })
              .catch(() => null),
          ]);

        const underlyingValue = await client
          .readContract({
            address: vault,
            abi: erc4626Abi,
            functionName: "convertToAssets",
            args: [shares],
            ...blockTagOpt,
          })
          .catch(() => null);

        let underlyingSymbol: string | null = null;
        let underlyingDecimals = decimals;
        if (assetAddress) {
          try {
            [underlyingSymbol, underlyingDecimals] = await Promise.all([
              client.readContract({
                address: assetAddress,
                abi: erc20MetadataAbi,
                functionName: "symbol",
                ...blockTagOpt,
              }),
              client.readContract({
                address: assetAddress,
                abi: erc20MetadataAbi,
                functionName: "decimals",
                ...blockTagOpt,
              }),
            ]);
          } catch {
            // underlying asset introspection is best-effort
          }
        }

        const totalSupply = await client
          .readContract({
            address: vault,
            abi: erc4626Abi,
            functionName: "totalSupply",
            ...blockTagOpt,
          })
          .catch(() => null);

        let sharePrice: number | null = null;
        if (totalAssets !== null && totalSupply !== null && totalSupply > 0n) {
          sharePrice =
            Number(formatUnits(totalAssets, underlyingDecimals)) /
            Number(formatUnits(totalSupply, decimals));
        }

        return {
          vaultAddress: vault,
          name,
          symbol,
          underlyingSymbol,
          sharesHeld: shares.toString(),
          sharesHeldFormatted: formatUnits(shares, decimals),
          underlyingValue: underlyingValue?.toString() ?? "0",
          underlyingValueFormatted: underlyingValue
            ? formatUnits(underlyingValue, underlyingDecimals)
            : "0",
          totalAssetsFormatted: totalAssets
            ? formatUnits(totalAssets, underlyingDecimals)
            : "unknown",
          sharePrice,
          decimals,
          blockNumber: blockNumber !== null ? blockNumber.toString() : null,
        };
      } catch (err) {
        return {
          vaultAddress,
          name: null,
          symbol: null,
          underlyingSymbol: null,
          sharesHeld: "0",
          sharesHeldFormatted: "0",
          underlyingValue: "0",
          underlyingValueFormatted: "0",
          totalAssetsFormatted: "unknown",
          sharePrice: null,
          decimals: 18,
          blockNumber: blockNumber !== null ? blockNumber.toString() : null,
          error:
            err instanceof Error
              ? err.message
              : "This address doesn't expose the ERC-4626 interface on this chain.",
        };
      }
    })
  );

  const duplicateWarnings = Object.values(duplicatesOf).map(
    (inputs) =>
      `You entered the same vault address more than once (${inputs.join(
        ", "
      )}) — it's shown only once below, which is why it wasn't "different data per address", there was only one unique address to read.`
  );

  return NextResponse.json(
    {
      wallet: getAddress(wallet),
      chain: chainParam,
      blockNumber: blockNumber !== null ? blockNumber.toString() : null,
      fetchedAt: new Date().toISOString(),
      warnings: duplicateWarnings.length > 0 ? duplicateWarnings : undefined,
      vaults: results,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
