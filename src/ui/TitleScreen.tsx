import { useState } from "react";

interface Props {
  onEnter: () => void;
}

const AGE_GATE_KEY = "storytime-lagos:age-confirmed";

export function TitleScreen({ onEnter }: Props) {
  const [showGate, setShowGate] = useState(
    () => localStorage.getItem(AGE_GATE_KEY) !== "true",
  );

  const confirmAge = () => {
    localStorage.setItem(AGE_GATE_KEY, "true");
    setShowGate(false);
    onEnter();
  };

  if (showGate) {
    return (
      <div className="title-screen">
        <h1 className="title-screen__logo">STORYTIME: What Is It About Lagos?</h1>
        <div className="age-gate">
          <p>
            This game contains mature themes: extortion, violence, discrimination and
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
      <h1 className="title-screen__logo">STORYTIME: What Is It About Lagos?</h1>
      <p className="title-screen__tagline">
        Seven people. One city. Every choice costs you money or costs you yourself.
      </p>
      <button className="choice-button choice-button--primary" onClick={onEnter}>
        Enter Lagos
      </button>
      <p className="title-screen__companion">A companion to the book</p>
    </div>
  );
}
