interface Props {
  value: number;
  max: number;
  color?: string;
  label: string;
}

// A small reusable animated progress bar (reuses the meter__track/__fill
// styling from MeterBar so a fill-width change always animates the same way
// across the app) for anything counted as "N of M" — chapters, endings.
export function ProgressBar({ value, max, color, label }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="progress-bar" role="group" aria-label={label}>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${pct}%`, background: color ?? "var(--accent)" }} />
      </div>
    </div>
  );
}
