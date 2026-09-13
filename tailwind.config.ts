import type { Config } from "tailwindcss";

// Colors are CSS variables (see app/globals.css) so the light/dark theme
// toggle can swap the whole palette by flipping a `data-theme` attribute,
// without changing any `bg-surface` / `text-ink` class names in components.
//
// Tailwind supports function-valued colors like this at runtime, but the
// published `Config` type doesn't model that shape, so the colors block is
// built separately and merged in with a cast rather than typed inline —
// avoids a false-positive type error on `next build` while keeping the
// rest of the config (content, darkMode, etc.) properly typed.
function withOpacity(variableName: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

const colors = {
  base: withOpacity("--color-base"),
  surface: withOpacity("--color-surface"),
  surfaceRaised: withOpacity("--color-surface-raised"),
  slab: withOpacity("--color-slab"),
  concrete: withOpacity("--color-concrete"),
  concreteMuted: withOpacity("--color-concrete-muted"),
  ink: withOpacity("--color-ink"),
  inkMuted: withOpacity("--color-ink-muted"),
  steel: withOpacity("--color-steel"),
  steelBright: withOpacity("--color-steel-bright"),
  brass: withOpacity("--color-brass"),
  rust: withOpacity("--color-rust"),
} as unknown as Record<string, string>;

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        slab: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
