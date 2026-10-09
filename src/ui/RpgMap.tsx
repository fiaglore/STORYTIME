import { useEffect, useRef, useState } from "react";
import { useInkStory } from "../engine/inkRunner";
import { MeterBar } from "./MeterBar";
import { FryingScene } from "../scenes/FryingScene";
import { ChangeMakingScene } from "../scenes/ChangeMakingScene";
import type { EndingInfo } from "../engine/inkRunner";
import type { Chapter } from "../content/types";

interface Props {
  chapter: Chapter;
  storyJson: unknown;
  onEnding: (ending: EndingInfo) => void;
  onExit: () => void;
}

const CHAPTER_METERS: Record<string, { key: string; label: string }> = {
  "the-grind": { key: "profit", label: "Profit" },
};

// Walk-to points on the Oshodi market map (percent of the stage box), one
// per `# spot: <id>` ink tag. Each has a slightly higher "npcY" where the
// stall art sits, so the player sprite stands in front of it on the path.
const HOTSPOTS: Record<string, { x: number; y: number; npcY: number; label: string }> = {
  stall: { x: 15, y: 55, npcY: 30, label: "Your stall" },
  tailor: { x: 40, y: 48, npcY: 24, label: "Baba Issa — tailor" },
  okra: { x: 63, y: 50, npcY: 27, label: "Aisha — okra" },
  mallam: { x: 87, y: 48, npcY: 24, label: "Mallam Sule" },
  road: { x: 90, y: 80, npcY: 80, label: "Danfo stop" },
};

const CHARACTERS: Record<string, string> = {
  ngozi: "/sprites/ngozi.png",
  "ngozi-fry": "/sprites/ngozi-fry.png",
  "ngozi-defiant": "/sprites/ngozi-defiant.png",
  jagaban: "/sprites/jagaban.png",
  trader: "/sprites/trader.png",
};

const NUDGE = 3;

export function RpgMap({ chapter, storyJson, onEnding, onExit }: Props) {
  const {
    ready,
    lines,
    choices,
    meters,
    sceneTag,
    stageTag,
    spotTag,
    ending,
    error,
    choose,
  } = useInkStory(storyJson);
  const base = import.meta.env.BASE_URL;
  const reportedEndingId = useRef<string | null>(null);

  const activeSpot = spotTag && HOTSPOTS[spotTag] ? spotTag : "stall";
  const [playerPos, setPlayerPos] = useState(() => ({
    x: HOTSPOTS[activeSpot].x,
    y: HOTSPOTS[activeSpot].y,
  }));
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [walking, setWalking] = useState(false);
  const walkTimeout = useRef<number | null>(null);
  const [charId, npcSpot] = (stageTag ?? "ngozi@stall").split("@");

  useEffect(() => {
    return () => {
      if (walkTimeout.current !== null) window.clearTimeout(walkTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (ending && reportedEndingId.current !== ending.id) {
      reportedEndingId.current = ending.id;
      onEnding(ending);
    }
  }, [ending, onEnding]);

  // Arrow keys / WASD nudge the figurine around the map for flavor; it's
  // never required to finish a step, since clicking the glowing hotspot
  // also walks the player there directly.
  useEffect(() => {
    if (dialogueOpen || walking || ending) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -NUDGE],
        ArrowDown: [0, NUDGE],
        ArrowLeft: [-NUDGE, 0],
        ArrowRight: [NUDGE, 0],
        w: [0, -NUDGE],
        s: [0, NUDGE],
        a: [-NUDGE, 0],
        d: [NUDGE, 0],
      };
      const delta = map[e.key];
      if (!delta) return;
      e.preventDefault();
      setPlayerPos((p) => ({
        x: Math.min(97, Math.max(3, p.x + delta[0])),
        y: Math.min(95, Math.max(8, p.y + delta[1])),
      }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogueOpen, walking, ending]);

  const walkToHotspot = (id: string) => {
    if (id !== activeSpot || dialogueOpen || walking) return;
    const spot = HOTSPOTS[id];
    setPlayerPos({ x: spot.x, y: spot.y });
    setWalking(true);
    walkTimeout.current = window.setTimeout(() => {
      walkTimeout.current = null;
      setWalking(false);
      setDialogueOpen(true);
    }, 350);
  };

  // Making a choice always closes the dialogue immediately, even when the
  // next beat's spot is the same hotspot (e.g. chidinma_call -> afternoon
  // both sit at "stall") — the player must approach again for the next
  // beat rather than the panel silently staying open with stale choices.
  const handleChoose = (index: number) => {
    setDialogueOpen(false);
    setWalking(false);
    if (walkTimeout.current !== null) {
      window.clearTimeout(walkTimeout.current);
      walkTimeout.current = null;
    }
    choose(index);
  };

  if (error) {
    return (
      <div className="story-screen story-screen--error">
        <p>Something went wrong reading this chapter: {error}</p>
        <button className="choice-button" onClick={onExit}>
          Back to the map
        </button>
      </div>
    );
  }

  if (!ready) {
    return <div className="story-screen story-screen--loading">Loading…</div>;
  }

  const chapterMeterDef = CHAPTER_METERS[chapter.id];
  const chapterMeter = chapterMeterDef
    ? { label: chapterMeterDef.label, value: meters[chapterMeterDef.key] ?? 0 }
    : undefined;

  const npc = HOTSPOTS[npcSpot] ?? HOTSPOTS.stall;
  const visibleLines = lines.slice(-2);

  return (
    <div className="story-screen" style={{ ["--chapter-accent" as string]: chapter.color }}>
      <header className="story-screen__header">
        <button className="icon-button" onClick={onExit} aria-label="Exit to map">
          ←
        </button>
        <h1 className="story-screen__title">{chapter.title}</h1>
      </header>

      <MeterBar naira={meters.naira ?? 0} spirit={meters.spirit ?? 0} chapterMeter={chapterMeter} />

      <div className="rpg-stage">
        <img className="rpg-stage__bg" src={`${base}sprites/map-oshodi.png`} alt="" aria-hidden="true" />

        {Object.entries(HOTSPOTS).map(([id, spot]) => (
          <button
            key={id}
            className={`rpg-hotspot ${id === activeSpot ? "rpg-hotspot--active" : "rpg-hotspot--inactive"}`}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            onClick={() => walkToHotspot(id)}
            disabled={id !== activeSpot || dialogueOpen || walking}
            aria-label={id === activeSpot ? `Walk to ${spot.label}` : spot.label}
          >
            {id === activeSpot && !dialogueOpen && !walking && (
              <span className="rpg-hotspot__pulse" />
            )}
          </button>
        ))}

        <img
          className="rpg-stage__npc"
          style={{ left: `${npc.x}%`, top: `${npc.npcY}%` }}
          src={`${base}${CHARACTERS[charId]?.slice(1) ?? "sprites/ngozi.png"}`}
          alt={charId}
        />

        <img
          className="rpg-stage__player"
          style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%` }}
          src={`${base}sprites/ngozi.png`}
          alt="Mama Ngozi"
        />
      </div>

      {!dialogueOpen && !ending && (
        <p className="rpg-hint">
          Walk to <strong>{HOTSPOTS[activeSpot].label}</strong> — arrow keys/WASD move, or tap the
          glowing spot.
        </p>
      )}

      {dialogueOpen && !ending && (
        <div className="rpg-dialogue">
          <div className="rpg-dialogue__text">
            {visibleLines.map((line, i) => (
              <p key={i} className="story-screen__paragraph">
                {line.text}
              </p>
            ))}
          </div>

          {sceneTag === "frying" && <FryingScene choices={choices} onChoose={handleChoose} />}
          {sceneTag === "changemaking" && (
            <ChangeMakingScene choices={choices} onChoose={handleChoose} />
          )}
          {sceneTag !== "frying" && sceneTag !== "changemaking" && (
            <div className="story-screen__choices">
              {choices.map((choice) => (
                <button
                  key={choice.index}
                  className="choice-button"
                  onClick={() => handleChoose(choice.index)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
