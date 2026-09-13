"use client";

import { useEffect, useRef, useState } from "react";

const OPTIONS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
];

export default function AutoRefreshControl({
  onRefresh,
  disabled,
}: {
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || disabled) return;
    const id = setInterval(() => onRefreshRef.current(), seconds * 1000);
    return () => clearInterval(id);
  }, [enabled, seconds, disabled]);

  // Auto-refreshing off a paused/hidden tab wastes RPC calls for nothing
  // visible — pause while the tab isn't in view.
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) setEnabled(false);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-inkMuted">
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Auto-refresh
      </label>
      <select
        value={seconds}
        disabled={!enabled || disabled}
        onChange={(e) => setSeconds(Number(e.target.value))}
        className="focus-ring border border-concreteMuted/40 bg-base px-1.5 py-1 text-xs text-ink disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.seconds} value={o.seconds}>
            every {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
