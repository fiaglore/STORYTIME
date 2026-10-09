import { useEffect, useRef } from "react";
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

export function StoryScreen({ chapter, storyJson, onEnding, onExit }: Props) {
  const { ready, lines, choices, meters, sceneTag, ending, error, choose } =
    useInkStory(storyJson);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reportedEndingId = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    if (ending && reportedEndingId.current !== ending.id) {
      reportedEndingId.current = ending.id;
      onEnding(ending);
    }
  }, [ending, onEnding]);

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

  return (
    <div className="story-screen" style={{ ["--chapter-accent" as string]: chapter.color }}>
      <header className="story-screen__header">
        <button className="icon-button" onClick={onExit} aria-label="Exit to map">
          ←
        </button>
        <h1 className="story-screen__title">{chapter.title}</h1>
      </header>

      <MeterBar naira={meters.naira ?? 0} spirit={meters.spirit ?? 0} chapterMeter={chapterMeter} />

      <div className="story-screen__scroll" ref={scrollRef}>
        {lines.map((line, i) => (
          <p key={i} className="story-screen__paragraph">
            {line.text}
          </p>
        ))}
      </div>

      {!ending && sceneTag === "frying" && (
        <FryingScene choices={choices} onChoose={choose} />
      )}
      {!ending && sceneTag === "changemaking" && (
        <ChangeMakingScene choices={choices} onChoose={choose} />
      )}
      {!ending && sceneTag !== "frying" && sceneTag !== "changemaking" && (
        <div className="story-screen__choices">
          {choices.map((choice) => (
            <button
              key={choice.index}
              className="choice-button"
              onClick={() => choose(choice.index)}
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
