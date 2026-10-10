import { useState } from "react";

interface Props {
  onEnterLife: () => void;
}

const AGE_GATE_KEY = "storytime-lagos:age-confirmed";

export function TitleScreen({ onEnterLife }: Props) {
  const [showGate, setShowGate] = useState(
    () => localStorage.getItem(AGE_GATE_KEY) !== "true",
  );

  const confirmAge = () => {
    localStorage.setItem(AGE_GATE_KEY, "true");
    setShowGate(false);
  };

  if (showGate) {
    return (
      <div className="title-screen">
        <h1 className="title-screen__logo">What Is It About Lagos?</h1>
        <div className="age-gate">
          <p>
            This game contains mature themes: extortion, violence, discrimination, injury and
            loss, written as consequences, never glamorised. It is intended for players
            16 and older.
          </p>
          <button className="choice-button choice-button--primary" onClick={confirmAge}>
            I'm 16 or older — continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="title-screen">
      <h1 className="title-screen__logo">What Is It About Lagos?</h1>
      <p className="title-screen__tagline">
        One city. Every choice costs you money or costs you yourself.
      </p>
      <div className="title-screen__modes">
        <button className="choice-button choice-button--primary" onClick={onEnterLife}>
          Find Out What It Is About Lagos
        </button>
      </div>
    </div>
  );
}
