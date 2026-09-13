"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "concrete-tracker:theme";

export default function ThemeToggle() {
  // Default to dark until we know better, so server/client markup matches
  // on first paint (avoids a hydration flash/mismatch).
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      className="focus-ring border border-concreteMuted/40 bg-surface px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab"
    >
      {!mounted ? "Theme" : theme === "dark" ? "☾ Dark" : "☀ Light"}
    </button>
  );
}
