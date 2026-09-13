"use client";

import { useState } from "react";
import { loadScript } from "@/lib/loadScript";
import { SITE_URL } from "@/lib/siteConfig";

const JSPDF_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const AUTOTABLE_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";

export type ExportVault = {
  name: string | null;
  symbol: string | null;
  chain?: string;
  vaultAddress: string;
  underlyingValueFormatted: string;
  underlyingSymbol: string | null;
  sharePrice: number | null;
  totalAssetsFormatted: string;
};

export type ExportPoints = {
  totalAmount: number | null;
  rank: number | null;
  totalAttributions: number | null;
};

export type ExportAirdrop = {
  yourTokens: number;
  yourUsdValue: number;
  fdv: number;
};

type Props = {
  wallet: string;
  ensName?: string | null;
  vaults: ExportVault[];
  points?: ExportPoints | null;
  airdrop?: ExportAirdrop | null;
};

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export default function ExportButtons({
  wallet,
  ensName,
  vaults,
  points,
  airdrop,
}: Props) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  function handleCsvExport() {
    const header = [
      "chain",
      "vault_name",
      "vault_symbol",
      "vault_address",
      "your_position",
      "underlying_symbol",
      "share_price",
      "vault_tvl",
    ];
    const rows = vaults.map((v) =>
      [
        v.chain ?? "",
        v.name ?? "",
        v.symbol ?? "",
        v.vaultAddress,
        v.underlyingValueFormatted,
        v.underlyingSymbol ?? "",
        v.sharePrice !== null ? v.sharePrice.toFixed(6) : "",
        v.totalAssetsFormatted,
      ]
        .map((cell) => csvEscape(String(cell)))
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    downloadBlob(csv, `concrete-tracker-${wallet.slice(0, 8)}.csv`, "text/csv");
  }

  function handleJsonExport() {
    const payload = {
      wallet,
      ensName: ensName ?? null,
      generatedAt: new Date().toISOString(),
      source: SITE_URL,
      vaults,
      points: points ?? null,
      airdropEstimate: airdrop ?? null,
    };
    downloadBlob(
      JSON.stringify(payload, null, 2),
      `concrete-tracker-${wallet.slice(0, 8)}.json`,
      "application/json"
    );
  }

  async function handlePdfExport() {
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      await loadScript(JSPDF_URL);
      await loadScript(AUTOTABLE_URL);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsPDFCtor = (window as any).jspdf?.jsPDF;
      if (!jsPDFCtor) throw new Error("PDF library failed to load.");

      const doc = new jsPDFCtor({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("🗿 Concrete Tracker — Position Report", margin, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(
        `Wallet: ${ensName ? `${ensName} (${wallet})` : wallet}`,
        margin,
        70
      );
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 84);
      doc.text(`Source: ${SITE_URL}`, margin, 98);

      let cursorY = 120;

      if (vaults.length > 0) {
        doc.setTextColor(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Vault positions", margin, cursorY);
        cursorY += 10;

        doc.autoTable({
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [["Chain", "Vault", "Position", "Share price", "Vault TVL"]],
          body: vaults.map((v) => [
            v.chain ?? "—",
            `${v.name ?? "Unnamed"}${v.symbol ? ` (${v.symbol})` : ""}`,
            `${v.underlyingValueFormatted} ${v.underlyingSymbol ?? ""}`.trim(),
            v.sharePrice !== null ? v.sharePrice.toFixed(6) : "—",
            `${v.totalAssetsFormatted} ${v.underlyingSymbol ?? ""}`.trim(),
          ]),
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [21, 20, 18] },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cursorY = (doc as any).lastAutoTable.finalY + 30;
      }

      if (points) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Points balance", margin, cursorY);
        cursorY += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
          `Points: ${points.totalAmount?.toLocaleString() ?? "—"}   Rank: ${
            points.rank !== null ? `#${points.rank}` : "—"
          }   Attributions: ${points.totalAttributions ?? "—"}`,
          margin,
          cursorY
        );
        cursorY += 30;
      }

      if (airdrop) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Hypothetical airdrop estimate (unofficial)", margin, cursorY);
        cursorY += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(
          `~${Math.round(airdrop.yourTokens).toLocaleString()} $CT (≈ $${airdrop.yourUsdValue.toLocaleString(
            undefined,
            { maximumFractionDigits: 0 }
          )}) at $${(airdrop.fdv / 1_000_000).toFixed(0)}M FDV — a what-if scenario, not a real allocation.`,
          margin,
          cursorY,
          { maxWidth: pageWidth - margin * 2 }
        );
        cursorY += 40;
      }

      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        "Independent, third-party tool. Not built or endorsed by Blueprint Finance / Concrete.",
        margin,
        doc.internal.pageSize.getHeight() - 30
      );

      doc.save(`concrete-tracker-report-${wallet.slice(0, 8)}.pdf`);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Couldn't generate the PDF."
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handlePdfExport}
        disabled={generatingPdf}
        className="focus-ring border border-brass/60 bg-brass/10 px-3 py-1.5 text-xs font-medium text-brass transition-colors hover:bg-brass/20 disabled:cursor-wait disabled:opacity-60"
      >
        {generatingPdf ? "Building PDF…" : "Download PDF report"}
      </button>
      <button
        type="button"
        onClick={handleCsvExport}
        className="focus-ring border border-concreteMuted/40 bg-base px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={handleJsonExport}
        className="focus-ring border border-concreteMuted/40 bg-base px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab"
      >
        Export JSON
      </button>
      {pdfError && <span className="text-xs text-rust">{pdfError}</span>}
    </div>
  );
}
