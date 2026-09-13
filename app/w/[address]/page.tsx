import { isAddress } from "viem";
import TrackerApp from "@/components/TrackerApp";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { address: string };
}): Promise<Metadata> {
  return {
    title: `${params.address.slice(0, 6)}…${params.address.slice(-4)} — Concrete Tracker 🗿`,
    description:
      "Live Concrete vault positions and points for this wallet — read directly on-chain, no login required.",
  };
}

// Public, shareable, no-form-fill wallet profile page: /w/0xabc...
// Anyone with the link sees this wallet's live positions immediately.
export default function WalletProfilePage({
  params,
}: {
  params: { address: string };
}) {
  if (!isAddress(params.address)) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-14">
        <p className="border border-rust/50 bg-rust/10 px-4 py-3 text-sm text-rust">
          &quot;{params.address}&quot; isn&apos;t a valid EVM wallet address.
        </p>
      </main>
    );
  }

  return <TrackerApp initialWallet={params.address} />;
}
