"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/lib/siteConfig";

type VaultOption = {
  vaultAddress: string;
  name: string | null;
  chain?: string;
  sharePrice: number | null;
};

export default function AlertSetup({ vaults }: { vaults: VaultOption[] }) {
  const priced = vaults.filter((v) => v.sharePrice !== null);
  const [selected, setSelected] = useState(priced[0]?.vaultAddress ?? "");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [browserAlertOn, setBrowserAlertOn] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  const vault = priced.find((v) => v.vaultAddress === selected);

  useEffect(() => {
    if (!threshold && vault?.sharePrice != null) {
      setThreshold(vault.sharePrice.toFixed(6));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function buildCheckUrl(withWebhook: boolean) {
    if (!vault) return "";
    const params = new URLSearchParams({
      chain: vault.chain ?? "ethereum",
      vault: vault.vaultAddress,
      direction,
      threshold: threshold || "0",
    });
    if (withWebhook && webhookUrl) params.set("webhook", webhookUrl);
    return `${SITE_URL}/api/alert-check?${params.toString()}`;
  }

  async function checkOnce(): Promise<{ crossed: boolean; sharePrice: number } | null> {
    const url = buildCheckUrl(!!webhookUrl);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setLastCheck(new Date().toLocaleTimeString());
      if (typeof json.sharePrice === "number") {
        return { crossed: !!json.crossed, sharePrice: json.sharePrice };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function enableBrowserAlert() {
    if (!("Notification" in window)) return;
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm !== "granted") return;

    setBrowserAlertOn(true);
    firedRef.current = false;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const result = await checkOnce();
      if (result?.crossed && !firedRef.current) {
        firedRef.current = true;
        new Notification("Concrete Tracker alert 🗿", {
          body: `${vault?.name ?? "Vault"} share price is ${direction} ${threshold} (now ${result.sharePrice.toFixed(6)})`,
        });
      }
    }, 60_000);
  }

  function disableBrowserAlert() {
    setBrowserAlertOn(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy manually:", text);
    }
  }

  if (priced.length === 0) return null;

  return (
    <section className="border border-concreteMuted/40 bg-surface">
      <header className="border-b border-concreteMuted/40 px-6 py-4">
        <h2 className="text-lg text-ink">Share price alerts</h2>
        <p className="text-xs text-inkMuted">
          Two options: a browser notification while this tab stays open, or
          a webhook URL you point an external free cron at (this app has no
          background server of its own to watch prices for you 24/7).
        </p>
      </header>

      <div className="space-y-4 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm text-inkMuted">Vault</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2 text-sm text-ink"
            >
              {priced.map((v) => (
                <option key={v.vaultAddress} value={v.vaultAddress}>
                  {v.name ?? v.vaultAddress.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-inkMuted">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "above" | "below")}
              className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2 text-sm text-ink"
            >
              <option value="above">Rises above</option>
              <option value="below">Falls below</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-inkMuted">
              Share price threshold
            </label>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="focus-ring w-full border border-concreteMuted/40 bg-base px-3 py-2 font-mono text-sm text-ink"
              placeholder="1.0250"
            />
          </div>
        </div>

        <div className="border-t border-concreteMuted/30 pt-4">
          <div className="mb-2 text-sm text-inkMuted">Browser notification (tab must stay open)</div>
          <div className="flex flex-wrap items-center gap-2">
            {!browserAlertOn ? (
              <button
                type="button"
                onClick={enableBrowserAlert}
                disabled={notifStatus === "unsupported" || !threshold}
                className="focus-ring border border-steel bg-steel/10 px-3 py-1.5 text-xs font-medium text-steelBright transition-colors hover:bg-steel/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enable browser alert
              </button>
            ) : (
              <button
                type="button"
                onClick={disableBrowserAlert}
                className="focus-ring border border-rust/50 bg-rust/10 px-3 py-1.5 text-xs font-medium text-rust transition-colors hover:bg-rust/20"
              >
                Stop watching
              </button>
            )}
            {notifStatus === "denied" && (
              <span className="text-xs text-rust">
                Notifications are blocked for this site in your browser settings.
              </span>
            )}
            {notifStatus === "unsupported" && (
              <span className="text-xs text-inkMuted">
                This browser doesn&apos;t support notifications.
              </span>
            )}
            {browserAlertOn && (
              <span className="text-xs text-inkMuted">
                Checking every 60s{lastCheck ? ` · last check ${lastCheck}` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-concreteMuted/30 pt-4">
          <div className="mb-2 text-sm text-inkMuted">
            Webhook (for Slack/Discord/Zapier via an external cron)
          </div>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
            className="focus-ring mb-2 w-full border border-concreteMuted/40 bg-base px-3 py-2 font-mono text-xs text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(buildCheckUrl(true))}
              disabled={!threshold}
              className="focus-ring border border-concreteMuted/40 bg-base px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy cron URL
            </button>
            <button
              type="button"
              onClick={() => checkOnce()}
              disabled={!threshold}
              className="focus-ring border border-concreteMuted/40 bg-base px-3 py-1.5 text-xs text-inkMuted transition-colors hover:bg-slab disabled:cursor-not-allowed disabled:opacity-50"
            >
              Test check now
            </button>
          </div>
          <p className="mt-2 text-xs text-inkMuted">
            Paste the copied URL into a free scheduler like cron-job.org set
            to hit it every few minutes. It fires the webhook every time the
            condition is still true (no server-side memory of "already
            fired") — have your receiver de-duplicate if you only want one
            ping.
          </p>
        </div>
      </div>
    </section>
  );
}
