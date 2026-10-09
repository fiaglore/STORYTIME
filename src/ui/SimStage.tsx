const CHARACTERS: Record<string, string> = {
  ngozi: "/sprites/ngozi.png",
  "ngozi-fry": "/sprites/ngozi-fry.png",
  "ngozi-defiant": "/sprites/ngozi-defiant.png",
  jagaban: "/sprites/jagaban.png",
  trader: "/sprites/trader.png",
};

const BACKGROUNDS: Record<string, string> = {
  stall: "/sprites/bg-stall.png",
  confrontation: "/sprites/bg-confrontation.png",
};

interface Props {
  charId: string;
  bgId: string;
}

// A persistent "stage" pinned above the story text: a small simulation view
// showing the current scene's background and a chibi pixel-art figurine for
// whoever the player is controlling or facing, driven entirely by a
// `# stage: <charId>@<bgId>` ink tag rather than any React-side logic.
export function SimStage({ charId, bgId }: Props) {
  const base = import.meta.env.BASE_URL;
  const charSrc = CHARACTERS[charId];
  const bgSrc = BACKGROUNDS[bgId] ?? BACKGROUNDS.stall;

  return (
    <div className="sim-stage">
      <img
        className="sim-stage__bg"
        src={`${base}${bgSrc.slice(1)}`}
        alt=""
        aria-hidden="true"
      />
      {charSrc && (
        <img
          className="sim-stage__char"
          src={`${base}${charSrc.slice(1)}`}
          alt={charId}
        />
      )}
    </div>
  );
}
