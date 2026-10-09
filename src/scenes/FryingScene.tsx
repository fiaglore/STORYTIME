import type { StoryChoice } from "../engine/inkRunner";

interface Props {
  choices: StoryChoice[];
  onChoose: (index: number) => void;
}

// Renders the ink choice set for the "prepare" knot as a small frying
// mini-scene instead of plain buttons. The choice text and consequences
// still live entirely in chapters/*.ink — this is only presentation.
export function FryingScene({ choices, onChoose }: Props) {
  const panSize = ["small", "medium", "large"];

  return (
    <div className="mini-scene mini-scene--frying">
      <div className="mini-scene__pans" aria-hidden="true">
        {panSize.map((size) => (
          <span key={size} className={`pan pan--${size}`}>
            🍳
          </span>
        ))}
      </div>
      <p className="mini-scene__prompt">How much do you fry this morning?</p>
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
