import { useState } from "react";
import type { StoryChoice } from "../engine/inkRunner";

interface Props {
  choices: StoryChoice[];
  onChoose: (index: number) => void;
}

// A light "count the change" flourish before the lunch-rush choice set.
// It does not gate the real ink choices — it is a beat of texture before
// the player picks from the chapter's actual options below.
export function ChangeMakingScene({ choices, onChoose }: Props) {
  const note = 1000;
  const price = 350;
  const correctChange = note - price;
  const options = [correctChange - 50, correctChange, correctChange + 100].sort(
    (a, b) => a - b,
  );
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="mini-scene mini-scene--change">
      <p className="mini-scene__prompt">
        Old Madam hands you a ₦{note} note for akara worth ₦{price}. Quick — how much
        change?
      </p>
      <div className="mini-scene__change-options">
        {options.map((amount) => (
          <button
            key={amount}
            className={`change-pill ${picked === amount ? "change-pill--picked" : ""}`}
            onClick={() => setPicked(amount)}
          >
            ₦{amount}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className="mini-scene__feedback">
          {picked === correctChange
            ? "Correct — she nods and moves on without a second look."
            : `Not quite — it's ₦${correctChange}. She counts it herself, just to be sure.`}
        </p>
      )}
      <div className="mini-scene__choices">
        {choices.map((choice) => (
          <button
            key={choice.index}
            className="choice-button choice-button--scene"
            onClick={() => onChoose(choice.index)}
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
