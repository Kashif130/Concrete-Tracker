"use client";

import { useEffect, useState } from "react";

const memCache = new Map<string, string | null>();

export function useEnsName(address?: string | null) {
  const [ensName, setEnsName] = useState<string | null>(
    address ? memCache.get(address.toLowerCase()) ?? null : null
  );

  useEffect(() => {
    if (!address) return;
    const key = address.toLowerCase();
    if (memCache.has(key)) {
      setEnsName(memCache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/ens?address=${address}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        memCache.set(key, json.ensName ?? null);
        setEnsName(json.ensName ?? null);
      })
      .catch(() => {
        if (!cancelled) memCache.set(key, null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return ensName;
}

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Shows the ENS name if resolved, otherwise a truncated address. Always title-hints the full address. */
export default function EnsAddress({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  const ensName = useEnsName(address);
  return (
    <span className={className} title={address}>
      {ensName ?? truncate(address)}
    </span>
  );
}
