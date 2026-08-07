function pctColor(pct: number): string {
  if (pct >= 1) return "#DD0E20"; // red — at/over the limit
  if (pct >= 0.8) return "#B8860B"; // amber-ish warning, still within the brand's muted palette
  return "#172983"; // navy — normal
}

export function UsageGauge({
  label,
  used,
  limit,
  helperText,
}: {
  label: string;
  used: number;
  limit: number;
  helperText?: string;
}) {
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const color = pctColor(pct);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="font-display font-bold text-sm">{label}</h4>
        <span className="text-sm font-semibold" style={{ color }}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
      {helperText && <p className="text-xs text-slate mt-2">{helperText}</p>}
    </div>
  );
}
