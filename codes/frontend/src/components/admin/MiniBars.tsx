// A small bar series for the admin dashboards: plain SVG, one bar per point, a text summary for screen readers. (Admin only;
// the app's own chart kit lives in components/charts.)
export function MiniBars({ points, label, height = 72 }: { points: { key: string; value: number }[]; label: string; height?: number }) {
  const peak = Math.max(1, ...points.map((point) => point.value));
  // at least 14 slots wide, so a single day is one bar, not a block across the card
  const width = Math.max(points.length, 14) * 10;
  return (
    <figure className="grid gap-1">
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-[72px] w-full">
        {points.map((point, index) => {
          const bar = Math.max(point.value > 0 ? 2 : 0, (point.value / peak) * (height - 4));
          return (
            <rect key={point.key} x={index * 10 + 1} y={height - bar} width={8} height={bar} rx={2} fill="var(--leaf)" opacity={0.85}>
              <title>{`${point.key}: ${point.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="flex justify-between text-caption text-muted-foreground">
        <span>{points[0]?.key ?? ''}</span>
        <span>{points[points.length - 1]?.key ?? ''}</span>
      </figcaption>
    </figure>
  );
}
