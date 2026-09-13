import type { Metadata } from "next";
import Link from "next/link";
import LiveVaultsDashboard from "@/components/LiveVaultsDashboard";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Live Vaults — Concrete Tracker 🗿",
  description:
    "Every known Concrete vault across chains, read live on-chain, with an allocation optimizer and compound-growth earning prediction.",
};

export default function VaultsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="focus-ring border border-concreteMuted/40 px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab"
        >
          ← Wallet tracker
        </Link>
        <ThemeToggle />
      </div>
      <LiveVaultsDashboard />
    </main>
  );
}
