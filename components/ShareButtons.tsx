"use client";

import { useState } from "react";

export default function ShareButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (older browsers, insecure context). Fall
      // back to a manual selection prompt instead of failing silently.
      window.prompt("Copy manually:", text);
    }
  }

  function handleTweet() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="focus-ring border border-concreteMuted/40 bg-base px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab"
      >
        {copied ? "Copied ✓" : "Copy to clipboard"}
      </button>
      <button
        type="button"
        onClick={handleTweet}
        className="focus-ring border border-steel bg-steel/10 px-3 py-1.5 text-xs font-medium text-steelBright transition-colors hover:bg-steel/20"
      >
        Share on X
      </button>
    </div>
  );
}
