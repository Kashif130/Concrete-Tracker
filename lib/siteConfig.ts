// Single source of truth for the app's own public URL, used in share text,
// share-card footers, QR codes, and public profile links. Override with
// NEXT_PUBLIC_SITE_URL in your environment if you deploy elsewhere.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://concrete-tracker-seven.vercel.app";

export const SITE_TAGLINE = "🗿 Concrete Tracker (unofficial)";

export function walletProfileUrl(wallet: string): string {
  return `${SITE_URL}/w/${wallet}`;
}
