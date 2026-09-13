# Position Ledger — Concrete / Blueprint Finance

A small, reusable dashboard that reads a wallet's Concrete vault positions
(app.concrete.xyz) and points balance (points.concrete.xyz) side by side.
Independent third-party tool — not built or endorsed by Blueprint Finance.

## What actually works out of the box

- **Vault positions**: fully functional. Reads live on-chain via the
  ERC-4626 standard (`balanceOf`, `convertToAssets`, `totalAssets`,
  `totalSupply`) using public RPCs for Ethereum, Arbitrum, and Base. No API
  key, no indexer, no cache — every load is a fresh chain read.
- **Points balance**: works only once you supply a Fuul API key (see
  below). Without it, the panel tells the user plainly that it isn't
  configured — it never fabricates or guesses a number.

## Why points needs extra setup

points.concrete.xyz is built on [Fuul](https://docs.fuul.xyz), a third-party
incentive platform. Fuul's per-user rewards endpoint
(`GET /v1/payouts/totals/{userIdentifier}`) requires the *project's* API
key — that's Concrete/Blueprint Finance's key, not something Fuul exposes
publicly for arbitrary lookups. Two ways to get one for your own use:

1. Ask Blueprint Finance for read-only Fuul API access.
2. Open `points.concrete.xyz`, open your browser's DevTools → Network tab,
   reload the page, and find the request(s) to `api.fuul.xyz`. Fuul's
   "Read-Only API Key" type is explicitly meant for front-end display, so
   it's already being shipped to every visitor's browser — copy the
   `Authorization: Bearer <key>` value from there.

Either way, put it in `.env.local`:

```
FUUL_API_KEY=your-key-here
```

## Latest additions (2026-09-13 update)

- **Arbitrum vault added**: `lib/knownVaults.ts` now includes one verified
  Arbitrum Concrete vault (`0xE2d8267D285a7ae1eDf48498fF044241d04e9608`).
  It isn't on app.concrete.xyz/earn's current "Live" list, but it's the
  exact address Concrete's own official `@concrete-xyz/sdk` docs use for
  their Arbitrum usage examples (chainId 42161) — a genuine, verifiable
  vault contract. It has no published APY (none is shown/guessed for it).
  "Scan known vaults" now works for Arbitrum instead of showing "none
  known yet".
- **More resilient chain reads**: `lib/chains.ts` no longer relies on a
  single shared public RPC per chain (the likely cause behind "vault
  position isn't working" / inconsistent Arbitrum reads). It now fans out
  across several independent public endpoints via viem's `fallback()`
  transport and retries automatically if one is rate-limited or times out.
  Setting `ETHEREUM_RPC_URL` / `ARBITRUM_RPC_URL` / `BASE_RPC_URL` still
  takes priority and is the most reliable option for heavy use.
- **New `/vaults` page — "Live Vaults" dashboard**: every known vault
  across every chain, read live on-chain with no wallet needed
  (`app/api/vaults/route.ts` + `components/LiveVaultsDashboard.tsx`).
  Includes:
  - A vault grid with live TVL, share price, and each vault's publicly
    reported APY, curator, and permission/deposit-link status.
  - A **vault optimizer**: pick a strategy (max APY / APY-weighted
    diversification / equal split), filter by chain and permission
    status, and get a suggested allocation breakdown.
  - An **earning prediction chart**: a dependency-free inline-SVG
    compound-growth curve (`components/EarningsChart.tsx`) plus
    30d/90d/180d/1y milestone values, computed from the blended APY of
    the suggested allocation.
  - Linked from the main tracker's header ("Live Vaults ↗").
  - Reported APY figures are explicitly labeled as periodic snapshots
    from app.concrete.xyz, not a live feed — consistent with this
    project's existing rule of never inventing a number it can't verify.

## Previous additions

- **PDF report export**: "Download PDF report" builds a clean, text-based
  PDF (wallet, ENS name if resolvable, every vault position, points, and
  the airdrop estimate) using jsPDF + jsPDF-AutoTable loaded from cdnjs
  only when you click the button — no extra npm dependency.
- **ENS resolution**: wallet addresses show their ENS name (via
  `/api/ens`, reverse-resolved against Ethereum mainnet) wherever they're
  displayed, falling back to a truncated address if none is set.
- **QR code**: each wallet's positions panel shows a QR code linking
  straight to its public profile page (see below), generated via
  goqr.me's free image API — no extra dependency.
- **CSV / JSON export**: raw position data as a spreadsheet-friendly CSV
  or a full JSON dump, for accountants or your own tooling.
- **Position change since last visit**: a small "+X% since last visit"
  badge next to each position, computed from this browser's own
  `localStorage` history (same mechanism as the existing sparklines).
- **Public profile page** — `/w/0xYourAddress` loads that wallet's
  positions and points immediately, no form to fill in. Share the link;
  whoever opens it sees a live read, not a snapshot.
- **Batch CSV wallet upload**: in the wallet field, "Upload CSV of
  wallets" pulls every valid `0x…` address out of any CSV/TXT file
  (one-per-line or a spreadsheet column) and adds it to the compare list.
- **Share price alerts** (`components/AlertSetup.tsx`): two options —
  (1) a browser notification while the tab stays open (polls every 60s),
  or (2) a stateless `GET /api/alert-check` endpoint that reads the
  current share price and, if your threshold is crossed, POSTs to a
  webhook URL you provide. **This app has no database or background cron
  of its own** — point a free external scheduler (cron-job.org, EasyCron,
  a scheduled GitHub Action, etc.) at the copied URL for real 24/7 alerts.
  It re-fires every check while the condition holds; have your webhook
  receiver de-duplicate if you only want one ping.
- **Expanded known-vault list**: `lib/knownVaults.ts` now lists every
  *live* vault address shown on app.concrete.xyz/earn's own listing at
  time of writing (6 on Ethereum). Two vaults shown there (WeETH Vault,
  WLFIcx) are permission-gated and don't expose a public address, so
  they're intentionally left out rather than guessed. No live vault was
  listed for Arbitrum or Base at the time of writing; paste your own in
  manual mode if/when one launches. Verify anything financially material
  against app.concrete.xyz yourself before relying on it.

Set `NEXT_PUBLIC_SITE_URL` in your environment if you deploy this
somewhere other than `https://concrete-tracker-seven.vercel.app` — it's
used for share text, the PDF/JSON export footer, and QR/profile links.

## New features

- **Airdrop allocation estimator**: a clearly-labeled *hypothetical,
  unofficial* "$CT" scenario calculator (Concrete hasn't announced a token,
  ticker, or airdrop date). Auto-fills "your points" from the wallet's real
  fetched points total; total community points, pool %, max supply, and
  FDV are all user-adjustable assumptions. Has its own text/image share
  buttons. Modeled after the airdrop calculator in the companion
  Concrete-Academy project, wired to real fetched data instead of a
  fully-manual form.
- **Compare wallets**: comma-separate multiple wallet addresses in the
  wallet field to see them side by side.
- **Scan known vaults**: instead of pasting vault addresses, check a
  wallet against a small hand-maintained list (`lib/knownVaults.ts`) across
  multiple chains at once. This is a curated seed list, not true on-chain
  discovery — add more addresses to that file as you find them.
- **Portfolio total**: each wallet's positions are summed per underlying
  asset at the top of its vault panel.
- **Trend sparklines + rough APY**: every fetch records a timestamped
  snapshot (share price, points) in this browser's `localStorage`. Once
  you have a couple of visits, a small trend line and a naive annualized
  rate appear. This is local to your browser/device only — not a
  server-tracked history, and not financial advice.
- **Points milestones**: a small banner fires when your points cross a
  round-number threshold (100, 500, 1,000, …) between visits.
- **Leaderboard preview**: the points panel also shows the top 5 from
  Fuul's public leaderboard for the project.
- **Share card image**: "Download image card" / "Share image" renders a
  PNG summary card (canvas-generated, no external image service) for
  vault positions and points, alongside the existing text-based copy/tweet
  buttons.
- **Remembers your last input**: wallet(s), mode, chain(s), and vault
  addresses are saved to `localStorage` and restored on your next visit.
- **Auto-refresh**: once you've loaded results, a toggle lets you
  re-fetch automatically every 30s/1m/5m. Pauses itself when the tab isn't
  visible so it doesn't burn RPC calls in the background.
- **Light/dark theme toggle**: top-right of the page; preference is saved
  locally.

Not implemented, on purpose: a "referral link" generator was requested,
but Concrete's actual referral mechanism isn't documented anywhere this
tool can verify — inventing a URL format would risk shipping a broken or
misleading link. Sharing already covers the practical need (share your
position/points as text, image, or a tweet).

## Troubleshooting: Arbitrum (or any chain) showing the same numbers

If different wallets/vaults ever appear to return identical data:

1. **Check the vault addresses you pasted aren't actually the same one
   twice.** The app now checksums and de-duplicates the comma-separated
   list and shows a warning banner if it finds a duplicate — a single
   underlying vault will obviously show identical numbers "for both",
   because there's only one being read.
2. **Set a dedicated RPC URL** via `ETHEREUM_RPC_URL` / `ARBITRUM_RPC_URL`
   / `BASE_RPC_URL` in `.env.local` (see `.env.example`). The public RPCs
   viem falls back to are shared and rate-limited, and Arbitrum's public
   endpoint in particular sees heavy traffic — a free key from Alchemy,
   Infura, or Ankr is far more reliable.
3. Each vault row now shows the **block number** its data was read at, and
   the API response includes `blockNumber` / `fetchedAt` — use these to
   confirm a fresh read actually happened rather than something cached.
4. All fetches (client-side and the API route) are now explicitly
   `cache: "no-store"`, so no browser/CDN layer should be caching by URL.

If it still happens with two genuinely different, correctly-pasted vault
addresses on a dedicated RPC, that points to something specific to those
contracts (e.g. both being freshly-deployed with no deposits yet, which
legitimately looks identical) rather than a caching bug — worth double
checking the addresses directly against app.concrete.xyz's own vault pages.

**Ethereum specifically was fixed**: the pre-filled/known Ethereum vault
address was an unverified guess that reverted on basic ERC-20 calls
(`decimals`, `balanceOf`) — that's why it errored for every wallet. It's
now two vaults (ctDefiUSDT, ctFraxUSD+) confirmed via Yield.xyz's own
Concrete integration docs. See `lib/knownVaults.ts`.

## Sharing a position or points balance

Both the points panel and each vault row now have **Copy to clipboard**
and **Share on X** buttons. They post a short, readable summary (not raw
JSON) — e.g. your points/rank, or a vault's position and share price —
either copied to your clipboard or opened as a pre-filled X/Twitter
compose window.

## Run locally

```bash
npm install
cp .env.example .env.local   # optionally fill in FUUL_API_KEY
npm run dev
```

Open http://localhost:3000, enter a wallet address, pick a chain, and paste
in one or more vault contract addresses (copy them from each vault's page
on app.concrete.xyz via its block explorer link).

## Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Or push this folder to a GitHub repo and import it at vercel.com/new. If
you have a `FUUL_API_KEY`, add it under Project Settings → Environment
Variables before deploying so points data works in production too.

## Extending it

- `lib/chains.ts` — add more chains by importing from `viem/chains`.
- `lib/erc4626Abi.ts` — the minimal ABI surface used; extend if a vault
  exposes extra data you want (e.g. deposit/withdrawal limits).
- `lib/fuul.ts` — swap in other Fuul endpoints (e.g. the points leaderboard
  at `/v1/payouts/leaderboard/points`) the same way; they follow the same
  auth pattern.
- `app/api/vault/route.ts` — add real yield/APY once you have a data source
  for historical share price (Fuul's incentives endpoint or a subgraph);
  this version deliberately doesn't invent an APY number from a single
  on-chain read.
