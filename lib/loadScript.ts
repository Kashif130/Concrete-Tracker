"use client";

const loaded = new Set<string>();
const loading = new Map<string, Promise<void>>();

/** Injects a <script src=...> once and resolves when it has loaded. Safe to call repeatedly. */
export function loadScript(src: string): Promise<void> {
  if (loaded.has(src)) return Promise.resolve();
  const existing = loading.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      loaded.add(src);
      resolve();
    };
    script.onerror = () =>
      reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });

  loading.set(src, promise);
  return promise;
}
