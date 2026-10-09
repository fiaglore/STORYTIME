import { useState } from "react";

interface Props {
  chapterTitle: string;
  protagonist: string;
  onDone: () => void;
}

// The Nigerian call-and-response storytelling ritual that opens every
// chapter, per the design pillar "Story, story!"
export function StorytimeOpening({ chapterTitle, protagonist, onDone }: Props) {
  const [step, setStep] = useState(0);

  const beats = [
    { call: "Story, story!", response: "Story!" },
    { call: "Once upon a time…", response: "Time, time!" },
  ];

  const current = beats[step];
  const isLast = step === beats.length - 1;

  return (
    <div className="storytime-opening">
      <p className="storytime-opening__eyebrow">Chapter — {chapterTitle}</p>
      <p className="storytime-opening__protagonist">as {protagonist}</p>
      <p className="storytime-opening__call">{current.call}</p>
      <button
        className="choice-button choice-button--call-response"
        onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
        autoFocus
      >
        {current.response}
      </button>
    </div>
  );
}
