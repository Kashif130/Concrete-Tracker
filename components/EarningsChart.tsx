"use client";

// Dependency-free inline SVG line/area chart for the earning-prediction
// curve on the /vaults optimizer. Deliberately not pulling in a charting
// library (recharts/chart.js/etc.) for one curve — same reasoning as
// components/Sparkline.tsx, just bigger and with axis labels.

export type ChartPoint = { day: number; value: number };

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

export default function EarningsChart({
  points,
  height = 220,
  unitLabel,
}: {
  points: ChartPoint[];
  height?: number;
  unitLabel?: string;
}) {
  if (points.length < 2) return null;

  const width = 640;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const maxDay = points[points.length - 1].day;

  const coords = points.map((p) => {
    const x = padLeft + (p.day / maxDay) * plotW;
    const y = padTop + plotH - ((p.value - minV) / range) * plotH;
    return { x, y, p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${padTop + plotH} L${coords[0].x.toFixed(1)},${padTop + plotH} Z`;

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minV + (range * i) / yTicks);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible font-mono">
      {/* gridlines + y-axis labels */}
      {yTickValues.map((v, i) => {
        const y = padTop + plotH - ((v - minV) / range) * plotH;
        return (
          <g key={i}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="rgb(var(--color-concrete-muted))"
              strokeOpacity={0.25}
              strokeWidth={1}
            />
            <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize={9} fill="rgb(var(--color-ink-muted))">
              {formatCompact(v)}
            </text>
          </g>
        );
      })}

      {/* x-axis labels at each provided point */}
      {coords.map((c, i) => (
        <text key={i} x={c.x} y={height - 8} textAnchor="middle" fontSize={9} fill="rgb(var(--color-ink-muted))">
          {c.p.day === 0 ? "today" : `d${c.p.day}`}
        </text>
      ))}

      <path d={areaPath} fill="rgb(var(--color-brass) / 0.12)" stroke="none" />
      <path d={linePath} fill="none" stroke="rgb(var(--color-brass))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill="rgb(var(--color-brass))" />
      ))}

      {unitLabel && (
        <text x={padLeft} y={padTop - 4} fontSize={9} fill="rgb(var(--color-ink-muted))">
          {unitLabel}
        </text>
      )}
    </svg>
  );
}
