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

// Mid-stride frames, swapped in for the idle pose while the player is
// walking (see scripts/gen-sprites.py). NPCs never move, so only the
// player-controlled ngozi variants have one.
const WALK_FRAMES: Record<string, string> = {
  ngozi: "/sprites/ngozi-walk.png",
  "ngozi-fry": "/sprites/ngozi-fry-walk.png",
  "ngozi-defiant": "/sprites/ngozi-defiant-walk.png",
};

const NUDGE = 3;
const WALK_MS = 420;
const WALK_FRAME_MS = 150;
// How close (in stage %) a tap needs to land to the active hotspot to count
// as "walk there and open the dialogue" rather than just free walking.
const HOTSPOT_TAP_RADIUS = 12;

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
  const [walkFrame, setWalkFrame] = useState(false);
  const walkTimeout = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [charId, npcSpot] = (stageTag ?? "ngozi@stall").split("@");

  // Mama Ngozi is the player — when she's the one "on stage" we pose the
  // player sprite itself (e.g. ngozi-fry) instead of drawing a second,
  // overlapping figurine. A separate NPC figurine only appears for
  // someone else (Jagaban, a trader).
  const playerIsSpeaker = charId.startsWith("ngozi");
  const playerSprite = playerIsSpeaker ? charId : "ngozi";
  const npcSpotInfo = HOTSPOTS[npcSpot] ?? HOTSPOTS.stall;
  const speakerPos = playerIsSpeaker ? playerPos : { x: npcSpotInfo.x, y: npcSpotInfo.npcY };

  useEffect(() => {
    return () => {
      if (walkTimeout.current !== null) window.clearTimeout(walkTimeout.current);
    };
  }, []);

  // Alternates the player sprite between its idle and mid-stride frame
  // while walking — a 2-frame walk cycle instead of a single static pose
  // sliding across the map. Render-time code only reads walkFrame when
  // walking is also true, so there's nothing to reset when it stops.
  useEffect(() => {
    if (!walking) return;
    const interval = window.setInterval(() => setWalkFrame((f) => !f), WALK_FRAME_MS);
    return () => window.clearInterval(interval);
  }, [walking]);

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

  // Walks the player to any point on the floor. Passing arriveHotspot opens
  // the dialogue once the walk finishes — used both for tapping the active
  // hotspot directly and for tapping anywhere close enough to it; a tap
  // further away just walks there with no dialogue, for free wandering.
  const walkTo = (x: number, y: number, arriveHotspot?: string) => {
    if (dialogueOpen || walking || ending) return;
    setPlayerPos({ x, y });
    setWalking(true);
    walkTimeout.current = window.setTimeout(() => {
      walkTimeout.current = null;
      setWalking(false);
      if (arriveHotspot) setDialogueOpen(true);
    }, WALK_MS);
  };

  const walkToHotspot = (id: string) => {
    if (id !== activeSpot) return;
    const spot = HOTSPOTS[id];
    walkTo(spot.x, spot.y, id);
  };

  // Tapping/clicking anywhere on the floor walks the player there — close
  // enough to the active hotspot snaps onto it and opens the dialogue,
  // same as tapping its button, so the hotspot is a destination to walk to
  // rather than the only clickable thing on the screen.
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dialogueOpen || walking || ending) return;
    const target = e.target as HTMLElement;
    if (target.closest(".rpg-hotspot")) return; // handled by the hotspot button itself
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(95, Math.max(8, ((e.clientY - rect.top) / rect.height) * 100));
    const hotspot = HOTSPOTS[activeSpot];
    const distToHotspot = Math.hypot(xPct - hotspot.x, yPct - hotspot.y);
    if (distToHotspot < HOTSPOT_TAP_RADIUS) {
      walkTo(hotspot.x, hotspot.y, activeSpot);
    } else {
      walkTo(xPct, yPct);
    }
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

  const latestLine = lines[lines.length - 1]?.text ?? "";
  const activeHotspot = HOTSPOTS[activeSpot];
  // Horizontal position follows the speaker but stays clear of the stage
  // edges. Vertical position is pinned near the stage top (not derived from
  // the speaker's Y) and grows downward with a max-height + scroll safety
  // net — a bubble anchored above a low speaker and sized to its text used
  // to get clipped by the stage's overflow: hidden on narrow screens when
  // the line was long enough to wrap to several lines. This was a real bug.
  const bubbleX = Math.min(72, Math.max(28, speakerPos.x));

  return (
    <div className="story-screen" style={{ ["--chapter-accent" as string]: chapter.color }}>
      <header className="story-screen__header">
        <button className="icon-button" onClick={onExit} aria-label="Exit to map">
          ←
        </button>
        <h1 className="story-screen__title">{chapter.title}</h1>
      </header>

      <MeterBar naira={meters.naira ?? 0} spirit={meters.spirit ?? 0} chapterMeter={chapterMeter} />

      <div className="rpg-stage" ref={stageRef} onClick={handleStageClick}>
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
              <>
                <span className="rpg-hotspot__pulse" />
                <span className="rpg-hotspot__label">{spot.label}</span>
              </>
            )}
          </button>
        ))}

        {!playerIsSpeaker && (
          <img
            className="rpg-stage__npc"
            style={{ left: `${npcSpotInfo.x}%`, top: `${npcSpotInfo.npcY}%` }}
            src={`${base}${CHARACTERS[charId]?.slice(1) ?? "sprites/trader.png"}`}
            alt={charId}
          />
        )}

        <img
          className={`rpg-stage__player ${walking ? "rpg-stage__player--walking" : ""}`}
          style={{ left: `${playerPos.x}%`, top: `${playerPos.y}%` }}
          src={`${base}${(
            (walking && walkFrame ? WALK_FRAMES[playerSprite] : undefined) ??
            CHARACTERS[playerSprite] ??
            "/sprites/ngozi.png"
          ).slice(1)}`}
          alt="Mama Ngozi"
        />

        {dialogueOpen && !ending && latestLine && (
          <div className="rpg-bubble" style={{ left: `${bubbleX}%` }}>
            {latestLine}
          </div>
        )}

        {dialogueOpen && !ending && (
          <div className="rpg-sheet">
            {sceneTag === "frying" && <FryingScene choices={choices} onChoose={handleChoose} />}
            {sceneTag === "changemaking" && (
              <ChangeMakingScene choices={choices} onChoose={handleChoose} />
            )}
            {sceneTag !== "frying" && sceneTag !== "changemaking" && (
              <div className="rpg-sheet__choices">
                {choices.map((choice) => (
                  <button
                    key={choice.index}
                    className="rpg-choice-pill"
                    onClick={() => handleChoose(choice.index)}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!dialogueOpen && !ending && (
          <div className="rpg-goal">
            Go to <strong>{activeHotspot.label}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
