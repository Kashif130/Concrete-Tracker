"use client";

import { useRef, useState } from "react";
import { SITE_URL } from "@/lib/siteConfig";

export type ShareStat = { label: string; value: string; accent?: boolean };

type Props = {
  kicker?: string; // small top-left label, e.g. "concrete.xyz · Points"
  headline: string; // the big hero number, e.g. "8,637"
  headlineLabel: string; // small caption under the headline, e.g. "POINTS"
  stats?: ShareStat[]; // secondary stat chips
  wallet?: string; // used for the identicon + truncated address
  filename: string;
};

// Deterministic PRNG (mulberry32) seeded from a string — used to build a
// per-wallet "identicon" so every shared card feels personalized without
// needing an image library or network call.
function seedFromString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hslStr(h: number, s: number, l: number) {
  return `hsl(${h.toFixed(0)} ${s}% ${l}%)`;
}

function drawIdenticon(
  ctx: CanvasRenderingContext2D,
  address: string,
  x: number,
  y: number,
  size: number
) {
  const rand = mulberry32(seedFromString(address.toLowerCase()));
  const hue = rand() * 360;
  const fg = hslStr(hue, 65, 60);
  const bg = hslStr((hue + 40) % 360, 45, 18);

  const cols = 5;
  const cellSize = size / cols;
  roundRect(ctx, x, y, size, size, 10);
  ctx.fillStyle = bg;
  ctx.fill();

  // Mirror the left half onto the right half (classic identicon symmetry).
  const half = Math.ceil(cols / 2);
  const grid: boolean[][] = [];
  for (let col = 0; col < half; col++) {
    const colVals: boolean[] = [];
    for (let row = 0; row < cols; row++) colVals.push(rand() > 0.5);
    grid.push(colVals);
  }

  ctx.fillStyle = fg;
  for (let col = 0; col < cols; col++) {
    const srcCol = col < half ? col : cols - 1 - col;
    for (let row = 0; row < cols; row++) {
      if (grid[srcCol][row]) {
        const px = x + col * cellSize + 3;
        const py = y + row * cellSize + 3;
        const s = cellSize - 6;
        roundRect(ctx, px, py, s, s, 3);
        ctx.fill();
      }
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Renders a premium-looking shareable PNG card using the Canvas API — no
// extra dependencies, no server-side image generation. Click generates the
// image; from there it's either downloaded or handed to the native share
// sheet (on browsers/devices that support sharing files).
export default function ShareCardImage({
  kicker = "concrete.xyz · Position Ledger",
  headline,
  headlineLabel,
  stats = [],
  wallet,
  filename,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  function draw(): HTMLCanvasElement | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    // --- Background: dark base + a soft radial glow behind the headline ---
    ctx.fillStyle = "#151412";
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(
      W * 0.28,
      H * 0.4,
      40,
      W * 0.28,
      H * 0.4,
      620
    );
    glow.addColorStop(0, "rgba(125,160,190,0.22)");
    glow.addColorStop(1, "rgba(125,160,190,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Faint grid texture matching the app's own background
    ctx.strokeStyle = "rgba(168,162,154,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // --- Outer frame: double border for a "plaque" feel ---
    roundRect(ctx, 20, 20, W - 40, H - 40, 18);
    ctx.strokeStyle = "rgba(125,160,190,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, 32, 32, W - 64, H - 64, 12);
    ctx.strokeStyle = "rgba(168,162,154,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Kicker badge, top-left ---
    ctx.fillStyle = "#7DA0BE";
    ctx.beginPath();
    ctx.arc(70, 82, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "600 21px monospace";
    ctx.fillStyle = "#7DA0BE";
    ctx.textBaseline = "middle";
    ctx.fillText(kicker.toUpperCase(), 86, 84);

    // --- Premium moai badge, top-left under the kicker ---
    ctx.font = "600 20px sans-serif";
    ctx.fillStyle = "#C9A227";
    ctx.fillText("🗿 PREMIUM", 70, 116);

    // --- Identicon + wallet, top-right ---
    if (wallet) {
      const idSize = 64;
      drawIdenticon(ctx, wallet, W - 70 - idSize, 52, idSize);
      ctx.font = "500 18px monospace";
      ctx.fillStyle = "#8C877D";
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
        W - 70,
        52 + idSize + 24
      );
      ctx.textAlign = "left";
    }

    // --- Headline (the hero number) ---
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(201,162,39,0.35)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#EDE9E3";
    ctx.font = "800 128px sans-serif";
    ctx.fillText(headline, 68, 300);
    ctx.shadowBlur = 0;

    ctx.font = "600 26px monospace";
    ctx.fillStyle = "#C9A227";
    ctx.fillText(headlineLabel.toUpperCase(), 70, 340);

    // --- Accent rule ---
    ctx.strokeStyle = "rgba(168,162,154,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(68, 372);
    ctx.lineTo(W - 68, 372);
    ctx.stroke();

    // --- Stat chips ---
    let sx = 68;
    const chipY = 404;
    const chipH = 92;
    ctx.font = "500 17px monospace";
    for (const stat of stats.slice(0, 3)) {
      const label = stat.label.toUpperCase();
      const value = stat.value;
      ctx.font = "500 16px monospace";
      const labelWidth = ctx.measureText(label).width;
      ctx.font = "700 30px monospace";
      const valueWidth = ctx.measureText(value).width;
      const chipW = Math.max(labelWidth, valueWidth) + 40;

      roundRect(ctx, sx, chipY, chipW, chipH, 10);
      ctx.fillStyle = "rgba(58,55,51,0.55)";
      ctx.fill();
      ctx.strokeStyle = "rgba(168,162,154,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "500 16px monospace";
      ctx.fillStyle = "#8C877D";
      ctx.fillText(label, sx + 20, chipY + 32);

      ctx.font = "700 30px monospace";
      ctx.fillStyle = stat.accent ? "#C9A227" : "#EDE9E3";
      ctx.fillText(value, sx + 20, chipY + 70);

      sx += chipW + 16;
      if (sx > W - 200) break;
    }

    // --- Footer ---
    ctx.font = "400 17px monospace";
    ctx.fillStyle = "#6F6B64";
    ctx.fillText(
      `${SITE_URL.replace(/^https?:\/\//, "")} · not built or endorsed by Blueprint Finance`,
      68,
      H - 56
    );

    setReady(true);
    return canvas;
  }

  function handleDownload() {
    const canvas = draw();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function handleShareImage() {
    const canvas = draw();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `${filename}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        share?: (data: { files?: File[]; title?: string }) => Promise<void>;
        canShare?: (data: { files?: File[] }) => boolean;
      };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await nav.share?.({ files: [file], title: headlineLabel });
          return;
        } catch {
          // user cancelled or share failed — fall through to download
        }
      }
      handleDownload();
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="focus-ring border border-concreteMuted/40 bg-base px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab"
        >
          Download image card
        </button>
        <button
          type="button"
          onClick={handleShareImage}
          className="focus-ring border border-steel bg-steel/10 px-3 py-1.5 text-xs font-medium text-steelBright transition-colors hover:bg-steel/20"
        >
          Share image
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className={
          ready
            ? "mt-3 w-full max-w-md border border-concreteMuted/30"
            : "hidden"
        }
      />
    </div>
  );
}
