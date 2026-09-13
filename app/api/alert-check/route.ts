import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { getPublicClient, isChainKey } from "@/lib/chains";
import { erc4626Abi } from "@/lib/erc4626Abi";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// IMPORTANT — read this before wiring up alerts:
// This app is a stateless Vercel deployment with no database, so it can't
// run its own background cron or remember "already fired" state between
// checks. This endpoint instead does ONE stateless thing well: given a
// vault + threshold + direction, it reads the CURRENT share price and, if
// the threshold is currently crossed, POSTs a small JSON payload to the
// webhook URL you provide. Point a free external cron (e.g. cron-job.org,
// EasyCron, or a GitHub Actions scheduled workflow) at this URL on
// whatever interval you want checked. Because there's no persistence, it
// will re-fire on every check for as long as the condition stays true —
// have your webhook receiver (Slack, Discord, Zapier, etc.) de-duplicate
// if you only want a one-time ping.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainParam = searchParams.get("chain") ?? "ethereum";
  const vaultParam = searchParams.get("vault");
  const direction = searchParams.get("direction") ?? "above"; // "above" | "below"
  const thresholdParam = searchParams.get("threshold");
  const webhook = searchParams.get("webhook");

  if (!vaultParam || !isAddress(vaultParam)) {
    return NextResponse.json(
      { error: "A valid `vault` address query param is required." },
      { status: 400 }
    );
  }
  if (!isChainKey(chainParam)) {
    return NextResponse.json(
      { error: `Unsupported chain "${chainParam}".` },
      { status: 400 }
    );
  }
  const threshold = Number(thresholdParam);
  if (!thresholdParam || Number.isNaN(threshold)) {
    return NextResponse.json(
      { error: "A numeric `threshold` query param is required." },
      { status: 400 }
    );
  }
  if (direction !== "above" && direction !== "below") {
    return NextResponse.json(
      { error: '`direction` must be "above" or "below".' },
      { status: 400 }
    );
  }

  const client = getPublicClient(chainParam);
  const vault = getAddress(vaultParam);

  try {
    const [decimals, assetAddress, totalAssets, totalSupply] =
      await Promise.all([
        client.readContract({
          address: vault,
          abi: erc4626Abi,
          functionName: "decimals",
        }),
        client
          .readContract({
            address: vault,
            abi: erc4626Abi,
            functionName: "asset",
          })
          .catch(() => null),
        client.readContract({
          address: vault,
          abi: erc4626Abi,
          functionName: "totalAssets",
        }),
        client.readContract({
          address: vault,
          abi: erc4626Abi,
          functionName: "totalSupply",
        }),
      ]);

    // Share price needs both sides normalized by their own decimals — the
    // underlying asset's decimals can differ from the vault share token's
    // (e.g. an 8-decimal WBTC vault minting 18-decimal shares). Matches the
    // same calculation /api/vault uses, so alerts agree with what's shown
    // on screen.
    let underlyingDecimals = decimals;
    if (assetAddress) {
      try {
        underlyingDecimals = await client.readContract({
          address: assetAddress,
          abi: erc4626Abi,
          functionName: "decimals",
        });
      } catch {
        // fall back to share decimals if the underlying can't be read
      }
    }

    const sharePrice =
      totalSupply > 0n
        ? Number(totalAssets) /
          10 ** underlyingDecimals /
          (Number(totalSupply) / 10 ** decimals)
        : null;

    if (sharePrice === null) {
      return NextResponse.json(
        { error: "Couldn't compute a share price for this vault." },
        { status: 422 }
      );
    }

    const crossed =
      direction === "above" ? sharePrice >= threshold : sharePrice <= threshold;

    let webhookResult: "sent" | "skipped" | "failed" = "skipped";
    if (crossed && webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vault,
            chain: chainParam,
            sharePrice,
            threshold,
            direction,
            crossed,
            checkedAt: new Date().toISOString(),
          }),
        });
        webhookResult = "sent";
      } catch {
        webhookResult = "failed";
      }
    }

    return NextResponse.json({
      vault,
      chain: chainParam,
      sharePrice,
      threshold,
      direction,
      crossed,
      webhook: webhook ? webhookResult : "not_configured",
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Couldn't read this vault's share price.",
      },
      { status: 500 }
    );
  }
}
