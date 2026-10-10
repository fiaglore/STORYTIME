import { useRef, useState } from "react";

export type InterviewResult = "great" | "good" | "miss";

interface Props {
  jobTitle: string;
  onComplete: (result: InterviewResult) => void;
}

// A timing mini-game played before a Lagos Life job offer is confirmed: a
// marker sweeps back and forth across a track and the player stops it near
// the center "zone". How close it lands decides a one-time naira/happiness
// bonus on top of the job — the job is granted either way, this just adds
// a bit of interactive tension to an otherwise single-click pick.
export function JobInterviewGame({ jobTitle, onComplete }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [stopped, setStopped] = useState<{ pct: number; result: InterviewResult } | null>(null);

  const handleStop = () => {
    if (stopped || !trackRef.current) return;
    const marker = trackRef.current.querySelector<HTMLDivElement>(".interview-track__marker");
    if (!marker) return;
    const trackRect = trackRef.current.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const markerCenter = markerRect.left + markerRect.width / 2;
    const pct = Math.min(100, Math.max(0, ((markerCenter - trackRect.left) / trackRect.width) * 100));
    const distance = Math.abs(pct - 50);
    const result: InterviewResult = distance <= 8 ? "great" : distance <= 22 ? "good" : "miss";
    setStopped({ pct, result });
    window.setTimeout(() => onComplete(result), 900);
  };

  return (
    <div className="mini-scene mini-scene--interview">
      <p className="mini-scene__prompt">
        Interview for {jobTitle} — tap Stop when the marker hits the green zone.
      </p>
      <div className="interview-track" ref={trackRef}>
        <div className="interview-track__zone" />
        <div
          className={`interview-track__marker ${
            stopped ? "interview-track__marker--stopped" : "interview-track__marker--running"
          }`}
          style={stopped ? { left: `${stopped.pct}%` } : undefined}
        />
      </div>
      {stopped ? (
        <p className={`mini-scene__feedback interview-feedback--${stopped.result}`}>
          {stopped.result === "great" && "Great answer — they're impressed."}
          {stopped.result === "good" && "Solid answer — they nod along."}
          {stopped.result === "miss" && "You fumbled the answer — awkward pause."}
        </p>
      ) : (
        <button className="choice-button choice-button--scene" onClick={handleStop}>
          Stop!
        </button>
      )}
    </div>
  );
}
