import { useEffect, useRef, useState } from "react";
import type { ChoreCategory } from "../content/chores";

interface Props {
  category: ChoreCategory;
  // 0-100 chore-category skill level — challenges get harder (narrower
  // timing zone, longer sequence, shorter countdown) as this rises, so
  // getting better at a category never trivializes the "hard challenge to
  // pass" the design asks for.
  level: number;
  onComplete: (passed: boolean) => void;
}

// Three distinct mini-challenges, one per ChoreCategory — "labor" (fetch
// water, sweep, laundry, queues) gets a timing challenge, "errands"
// (calls, shopping, data top-up) gets a memory/sequence challenge, and
// "finance" (market money, bank queue, settling staff) gets a quick-math
// change challenge. Each renders completely differently but all end the
// same way: one onComplete(passed) call.
export function ChoreChallenge({ category, level, onComplete }: Props) {
  if (category === "labor") return <TimingChallenge level={level} onComplete={onComplete} />;
  if (category === "errands") return <SequenceChallenge level={level} onComplete={onComplete} />;
  return <MathChallenge level={level} onComplete={onComplete} />;
}

// --- labor: stop the sweeping marker inside the zone (same shape as
// JobInterviewGame's timing game) — the zone narrows as level rises.
function TimingChallenge({ level, onComplete }: { level: number; onComplete: (passed: boolean) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [stopped, setStopped] = useState<{ pct: number; passed: boolean } | null>(null);
  const zoneWidth = Math.max(10, 26 - Math.round((level / 100) * 14));
  const zoneLeft = 50 - zoneWidth / 2;

  const handleStop = () => {
    if (stopped || !trackRef.current) return;
    const marker = trackRef.current.querySelector<HTMLDivElement>(".interview-track__marker");
    if (!marker) return;
    const trackRect = trackRef.current.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const markerCenter = markerRect.left + markerRect.width / 2;
    const pct = Math.min(100, Math.max(0, ((markerCenter - trackRect.left) / trackRect.width) * 100));
    const passed = pct >= zoneLeft && pct <= zoneLeft + zoneWidth;
    setStopped({ pct, passed });
    window.setTimeout(() => onComplete(passed), 700);
  };

  return (
    <div className="mini-scene mini-scene--interview">
      <p className="mini-scene__prompt">Stop the marker in the zone to get it done right.</p>
      <div className="interview-track" ref={trackRef}>
        <div className="interview-track__zone" style={{ left: `${zoneLeft}%`, width: `${zoneWidth}%` }} />
        <div
          className={`interview-track__marker ${
            stopped ? "interview-track__marker--stopped" : "interview-track__marker--running"
          }`}
          style={stopped ? { left: `${stopped.pct}%` } : undefined}
        />
      </div>
      {stopped ? (
        <p className={`mini-scene__feedback interview-feedback--${stopped.passed ? "great" : "miss"}`}>
          {stopped.passed ? "Nailed it." : "Missed the zone."}
        </p>
      ) : (
        <button className="choice-button choice-button--scene" onClick={handleStop}>
          Stop!
        </button>
      )}
    </div>
  );
}

// --- errands: memorize a short sequence of icons, then tap them back in
// order — the sequence gets longer as level rises.
const SEQUENCE_ICONS = ["🥬", "🧺", "📱", "🧴", "🍞", "🧃", "🪣", "📦"];

function SequenceChallenge({ level, onComplete }: { level: number; onComplete: (passed: boolean) => void }) {
  const length = 3 + Math.min(3, Math.floor(level / 25));
  const [sequence] = useState(() => {
    const shuffled = [...SEQUENCE_ICONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, length);
  });
  const [options] = useState(() => [...sequence].sort(() => Math.random() - 0.5));
  const [phase, setPhase] = useState<"preview" | "input" | "done">("preview");
  const [picked, setPicked] = useState<string[]>([]);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("input"), 1200 + length * 350);
    return () => window.clearTimeout(t);
  }, [length]);

  const handlePick = (icon: string) => {
    if (phase !== "input") return;
    const next = [...picked, icon];
    setPicked(next);
    if (next.length === sequence.length) {
      const ok = next.every((v, i) => v === sequence[i]);
      setPassed(ok);
      setPhase("done");
      window.setTimeout(() => onComplete(ok), 700);
    }
  };

  return (
    <div className="mini-scene">
      <p className="mini-scene__prompt">
        {phase === "preview" ? "Remember the order…" : phase === "input" ? "Now tap them back in order." : ""}
      </p>
      <div className="mini-scene__pans">
        {(phase === "preview" ? sequence : options).map((icon, i) => (
          <button
            key={`${icon}-${i}`}
            className={`change-pill ${picked.includes(icon) ? "change-pill--picked" : ""}`}
            onClick={() => handlePick(icon)}
            disabled={phase !== "input"}
          >
            {icon}
          </button>
        ))}
      </div>
      {phase === "done" && (
        <p className={`mini-scene__feedback interview-feedback--${passed ? "great" : "miss"}`}>
          {passed ? "Got it exactly right." : "That's not the order — you mixed it up."}
        </p>
      )}
    </div>
  );
}

// --- finance: quick change-counting under a shrinking countdown.
function MathChallenge({ level, onComplete }: { level: number; onComplete: (passed: boolean) => void }) {
  const [problem] = useState(() => {
    const price = (1 + Math.floor(Math.random() * 19)) * 50;
    const paidOptions = [500, 1000, 2000, 5000].filter((p) => p > price);
    const paid = paidOptions[Math.floor(Math.random() * paidOptions.length)] ?? price + 500;
    const correct = paid - price;
    const distractors = new Set<number>();
    while (distractors.size < 3) {
      const offset = (Math.floor(Math.random() * 6) + 1) * 50 * (Math.random() < 0.5 ? 1 : -1);
      const candidate = correct + offset;
      if (candidate > 0 && candidate !== correct) distractors.add(candidate);
    }
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return { price, paid, correct, options };
  });
  const seconds = Math.max(3, 7 - Math.floor(level / 25));
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [answered, setAnswered] = useState<{ value: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (answered) return;
    if (timeLeft <= 0) {
      setAnswered({ value: -1, passed: false });
      window.setTimeout(() => onComplete(false), 700);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answered]);

  const handleAnswer = (value: number) => {
    if (answered) return;
    const passed = value === problem.correct;
    setAnswered({ value, passed });
    window.setTimeout(() => onComplete(passed), 700);
  };

  return (
    <div className="mini-scene">
      <p className="mini-scene__prompt">
        Customer pays ₦{problem.paid.toLocaleString()} for a ₦{problem.price.toLocaleString()} item — how much
        change? ({timeLeft}s)
      </p>
      <div className="mini-scene__change-options">
        {problem.options.map((opt) => (
          <button
            key={opt}
            className={`change-pill ${answered?.value === opt ? "change-pill--picked" : ""}`}
            onClick={() => handleAnswer(opt)}
            disabled={!!answered}
          >
            ₦{opt.toLocaleString()}
          </button>
        ))}
      </div>
      {answered && (
        <p className={`mini-scene__feedback interview-feedback--${answered.passed ? "great" : "miss"}`}>
          {answered.passed
            ? "Correct — change given accurately."
            : answered.value === -1
              ? "Too slow — the customer walked off annoyed."
              : "Wrong change — the customer isn't happy."}
        </p>
      )}
    </div>
  );
}
