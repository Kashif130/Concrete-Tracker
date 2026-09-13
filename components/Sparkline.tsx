type Point = { t: number; v: number };

// Tiny dependency-free inline SVG sparkline — avoids pulling in a charting
// library for what's just a trend hint next to a number.
export default function Sparkline({
  points,
  width = 100,
  height = 28,
  color = "rgb(var(--color-steel-bright))",
}: {
  points: Point[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((p.v - min) / range) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
