import { latestDelta, useStatDeltas } from "./useStatDeltas";

interface MeterProps {
  label: string;
  value: number;
  accent: string;
  delta?: number;
}

function Meter({ label, value, accent, delta }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="meter" role="group" aria-label={`${label}: ${clamped} of 100`}>
      <div className="meter__labelRow">
        <span className="meter__label">{label}</span>
        <span className="meter__value">
          {clamped}
          {delta != null && (
            <span
              key={`${delta}-${clamped}`}
              className={`meter__popup ${delta > 0 ? "meter__popup--up" : "meter__popup--down"}`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
      </div>
      <div className={`meter__track ${delta != null ? "meter__track--flash" : ""}`}>
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
  const values: Record<string, number> = { naira, spirit };
  if (chapterMeter) values.chapter = chapterMeter.value;
  const events = useStatDeltas(values);

  return (
    <div className="meter-bar">
      <Meter label="Naira" value={naira} accent="var(--naira)" delta={latestDelta(events, "naira")} />
      <Meter label="Spirit" value={spirit} accent="var(--spirit)" delta={latestDelta(events, "spirit")} />
      {chapterMeter && (
        <div className="meter meter--chapter">
          <div className="meter__labelRow">
            <span className="meter__label">{chapterMeter.label}</span>
            <span className="meter__value">
              {chapterMeter.value}
              {(() => {
                const d = latestDelta(events, "chapter");
                return (
                  d != null && (
                    <span
                      key={`${d}-${chapterMeter.value}`}
                      className={`meter__popup ${d > 0 ? "meter__popup--up" : "meter__popup--down"}`}
                    >
                      {d > 0 ? `+${d}` : d}
                    </span>
                  )
                );
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
