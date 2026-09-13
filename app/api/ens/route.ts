import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { getEnsClient } from "@/lib/chains";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Simple in-memory cache (per serverless instance) so repeated lookups for
// the same address within a short window don't hammer the RPC. Not shared
// across instances/regions — that's fine, it's just a courtesy cache.
const cache = new Map<string, { name: string | null; at: number }>();
const CACHE_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "A valid `address` query param is required." },
      { status: 400 }
    );
  }

  const checksummed = getAddress(address);
  const cached = cache.get(checksummed);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json({ address: checksummed, ensName: cached.name });
  }

  try {
    const client = getEnsClient();
    const ensName = await client.getEnsName({ address: checksummed });
    cache.set(checksummed, { name: ensName ?? null, at: Date.now() });
    return NextResponse.json(
      { address: checksummed, ensName: ensName ?? null },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    // ENS lookups can fail if no RPC is configured for mainnet or the
    // provider rate-limits — fail soft, the app works fine without a name.
    return NextResponse.json({
      address: checksummed,
      ensName: null,
      warning: err instanceof Error ? err.message : "ENS lookup failed.",
    });
  }
}
