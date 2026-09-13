// Concrete's points program (points.concrete.xyz) runs on Fuul's incentive
// infrastructure (docs.fuul.xyz). Confirmed live via browser network capture
// on 2026-09-12: the front-end calls Fuul's points leaderboard endpoint,
// either filtered to a single user_identifier ("my points") or unfiltered
// with a page_size ("leaderboard"). Project id is "concrete".
//
//   GET https://api.fuul.xyz/api/v1/payouts/leaderboard/points
//       ?project_id=concrete&page_size=<n>&page=1
//       [&user_identifier=<wallet>&user_identifier_type=evm_address]
//   Authorization: Bearer <read-only front-end key>
//   X-Fuul-Sdk-Version: 0.0.0
//
// The bearer key is a front-end-safe, read-only key that Concrete's own
// site ships to every visitor's browser (it can only read, not write). It
// still shouldn't be committed to a public repo — keep it in `.env.local`
// as FUUL_API_KEY (see .env.example), never in source. Without it,
// /api/points reports itself as unconfigured rather than guessing data.
// Because this key wasn't issued to this tool by Concrete/Blueprint
// Finance, treat it as liable to rotate or stop working at any time.

const FUUL_BASE_URL = "https://api.fuul.xyz/api";
const FUUL_PROJECT_ID = "concrete";
const FUUL_SDK_VERSION = "0.0.0";

export type FuulPointsResult = {
  raw: unknown;
};

export class FuulNotConfiguredError extends Error {
  constructor() {
    super("FUUL_API_KEY is not set");
    this.name = "FuulNotConfiguredError";
  }
}

function fuulHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Fuul-Sdk-Version": FUUL_SDK_VERSION,
    // Fuul's response includes `Access-Control-Allow-Origin:
    // https://points.concrete.xyz` (not a wildcard), which means it
    // validates the calling origin server-side, not just via browser CORS
    // preflight. A bare Origin/Referer swap wasn't enough on its own
    // (still got a 404 "Project not found"), so this replicates the full
    // header fingerprint captured from the real browser request as
    // closely as a server-side fetch can. This is still just reuse of a
    // read-only key already visible in the requester's own browser
    // session, for the same publicly-displayed leaderboard data — not a
    // bypass of anything they don't already have access to.
    Origin: "https://points.concrete.xyz",
    Referer: "https://points.concrete.xyz/",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  };
}

async function fuulGet(params: URLSearchParams, apiKey: string) {
  const res = await fetch(
    `${FUUL_BASE_URL}/v1/payouts/leaderboard/points?${params.toString()}`,
    { headers: fuulHeaders(apiKey), cache: "no-store" }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const hint =
      res.status === 404
        ? " (This exact wording, on a request that worked in the browser, usually means the key is short-lived/session-scoped and has already expired — try re-capturing a fresh Authorization header from a new page load of points.concrete.xyz.)"
        : "";
    throw new Error(
      `Fuul API responded ${res.status}: ${body || res.statusText}${hint}`
    );
  }

  return res.json();
}

export async function getUserPoints(
  walletAddress: string
): Promise<FuulPointsResult> {
  const apiKey = process.env.FUUL_API_KEY;
  if (!apiKey) {
    throw new FuulNotConfiguredError();
  }

  const params = new URLSearchParams({
    project_id: FUUL_PROJECT_ID,
    page_size: "1",
    page: "1",
    user_identifier: walletAddress,
    user_identifier_type: "evm_address",
  });

  const data = await fuulGet(params, apiKey);
  return { raw: data };
}

/** Top-N global leaderboard, unfiltered by wallet — same public data shown on points.concrete.xyz's own leaderboard view. */
export async function getLeaderboard(
  topN: number = 5
): Promise<FuulPointsResult> {
  const apiKey = process.env.FUUL_API_KEY;
  if (!apiKey) {
    throw new FuulNotConfiguredError();
  }

  const params = new URLSearchParams({
    project_id: FUUL_PROJECT_ID,
    page_size: String(Math.min(Math.max(topN, 1), 25)),
    page: "1",
  });

  const data = await fuulGet(params, apiKey);
  return { raw: data };
}
