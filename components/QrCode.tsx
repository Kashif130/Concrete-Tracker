"use client";

// Renders a QR code as an <img>, via goqr.me's free public QR image API.
// No extra npm dependency, no server-side generation needed — only the
// destination URL is sent to the third party, nothing wallet-sensitive
// beyond what's already public (an address is not a secret).
export default function QrCode({
  url,
  size = 160,
  label,
}: {
  url: string;
  size?: number;
  label?: string;
}) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    url
  )}`;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`QR code linking to ${url}`}
        width={size}
        height={size}
        className="border border-concreteMuted/40 bg-white p-1.5"
      />
      {label && (
        <span className="max-w-[160px] break-all text-center text-[10px] text-inkMuted">
          {label}
        </span>
      )}
    </div>
  );
}
