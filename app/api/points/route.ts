import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  getUserPoints,
  getLeaderboard,
  FuulNotConfiguredError,
} from "@/lib/fuul";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const includeLeaderboard = searchParams.get("leaderboard") === "1";

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: "A valid `wallet` address query param is required." },
      { status: 400 }
    );
  }

  const leaderboardPromise: Promise<{ data?: unknown; error?: string }> =
    includeLeaderboard
      ? getLeaderboard(5)
          .then((r) => ({ data: r.raw }))
          .catch((err) => ({
            error: err instanceof Error ? err.message : "Unknown error",
          }))
      : Promise.resolve({});

  try {
    const [result, leaderboard] = await Promise.all([
      getUserPoints(wallet),
      leaderboardPromise,
    ]);
    return NextResponse.json(
      {
        wallet,
        status: "ok",
        totals: result.raw,
        leaderboard: leaderboard.data,
        leaderboardError: leaderboard.error,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    if (err instanceof FuulNotConfiguredError) {
      return NextResponse.json(
        {
          wallet,
          status: "not_configured",
          message:
            "FUUL_API_KEY is not set, so points data can't be read. See README.md for how to get Concrete's read-only Fuul key.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        wallet,
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
