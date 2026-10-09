interface MeterProps {
  label: string;
  value: number;
  accent: string;
}

function Meter({ label, value, accent }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="meter" role="group" aria-label={`${label}: ${clamped} of 100`}>
      <div className="meter__labelRow">
        <span className="meter__label">{label}</span>
        <span className="meter__value">{clamped}</span>
      </div>
      <div className="meter__track">
        <div
          className="meter__fill"
          style={{ width: `${clamped}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}

interface MeterBarProps {
  naira: number;
  spirit: number;
  chapterMeter?: { label: string; value: number; max?: number };
}

export function MeterBar({ naira, spirit, chapterMeter }: MeterBarProps) {
  return (
    <div className="meter-bar">
      <Meter label="Naira" value={naira} accent="#C9A227" />
      <Meter label="Spirit" value={spirit} accent="#3C6E8F" />
      {chapterMeter && (
        <div className="meter meter--chapter">
          <div className="meter__labelRow">
            <span className="meter__label">{chapterMeter.label}</span>
            <span className="meter__value">{chapterMeter.value}</span>
          </div>
        </div>
      )}
    </div>
  );
}
