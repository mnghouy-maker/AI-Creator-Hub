/**
 * Usage area chart — pure SVG (SSR-safe, no canvas). Follows the dataviz
 * principles: faint gridlines, a soft area fill, an emphasized endpoint dot.
 * Theme-aware via currentColor / CSS vars so it recolors with light/dark.
 */
'use client';

export function UsageChart({ data, height = 190 }: { data: number[]; height?: number }) {
  const width = 640; // viewBox units; scales to container via preserveAspectRatio
  const pad = 6;
  const max = Math.max(...data) * 1.15;
  const x = (i: number) => (width / (data.length - 1)) * i;
  const y = (v: number) => height - pad - (v / max) * (height - 2 * pad);

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = data.length - 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-[190px] w-full text-accent"
      role="img"
      aria-label="Usage over the last 30 days"
    >
      <defs>
        <linearGradient id="usage-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {[0, 1, 2, 3].map((g) => {
        const gy = pad + ((height - 2 * pad) * g) / 3;
        return (
          <line
            key={g}
            x1="0"
            y1={gy}
            x2={width}
            y2={gy}
            stroke="hsl(var(--border-2))"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      <path d={area} fill="url(#usage-fill)" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(last)} cy={y(data[last]!)} r="4.5" fill="currentColor" />
      <circle
        cx={x(last)}
        cy={y(data[last]!)}
        r="8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3"
      />
    </svg>
  );
}
