"use client";

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "rgb(var(--color-steel-bright))",
  arbitrum: "rgb(var(--color-brass))",
  base: "rgb(var(--color-rust))",
};

const SLICE_COLORS = [
  "rgb(var(--color-brass))",
  "rgb(var(--color-steel-bright))",
  "rgb(var(--color-rust))",
  "rgb(var(--color-concrete))",
];

export function chainColor(chain: string, fallbackIndex = 0) {
  return CHAIN_COLORS[chain] ?? SLICE_COLORS[fallbackIndex % SLICE_COLORS.length];
}

export default function AllocationDonut({
  weights,
  size = 148,
}: {
  weights: number[];
  size?: number;
}) {
  const stroke = size * 0.16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = weights.map((w, i) => {
    const length = w * circumference;
    const seg = { color: SLICE_COLORS[i % SLICE_COLORS.length], length, offset };
    offset += length;
    return seg;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[0_0_18px_rgba(201,162,39,0.15)]">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgb(var(--color-slab))"
        strokeWidth={stroke}
      />
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth={stroke}
          strokeDasharray={`${seg.length} ${circumference - seg.length}`}
          strokeDashoffset={-seg.offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      ))}
      <circle cx={center} cy={center} r={radius - stroke / 2 - 6} fill="rgb(var(--color-surface))" />
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        fontSize={size * 0.1}
        fill="rgb(var(--color-ink-muted))"
        className="uppercase tracking-wide"
      >
        split
      </text>
      <text x={center} y={center + 16} textAnchor="middle" fontSize={size * 0.13} fill="rgb(var(--color-brass))" fontFamily="var(--font-mono)">
        {weights.length}
      </text>
    </svg>
  );
}
