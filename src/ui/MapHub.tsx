import chapters from "../content/chapters.json";
import { ChapterCard } from "./ChapterCard";
import { useGameStore } from "../engine/store";
import type { Chapter } from "../content/types";

interface Props {
  onSelect: (chapter: Chapter) => void;
  onOpenEndings: () => void;
  onOpenSettings: () => void;
}

export function MapHub({ onSelect, onOpenEndings, onOpenSettings }: Props) {
  const progress = useGameStore((s) => s.progress);
  const list = chapters as Chapter[];

  const isUnlocked = (chapter: Chapter, index: number) => {
    if (chapter.free || index === 0) return true;
    const prior = list[index - 1];
    return Boolean(progress[prior.id]?.finished);
  };

  return (
    <div className="map-hub">
      <header className="map-hub__header">
        <div>
          <h1>STORYTIME: Lagos</h1>
          <p className="map-hub__subtitle">Seven people. One city. Every choice costs you.</p>
        </div>
        <div className="map-hub__actions">
          <button className="choice-button choice-button--ghost" onClick={onOpenEndings}>
            Endings gallery
          </button>
          <button className="choice-button choice-button--ghost" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      <div className="map-hub__grid">
        {list.map((chapter, index) => {
          const unlocked = isUnlocked(chapter, index);
          const found = progress[chapter.id]?.endingsFound.length ?? 0;
          return (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              unlocked={unlocked}
              endingsFound={found}
              onPlay={() => unlocked && onSelect(chapter)}
            />
          );
        })}
      </div>
    </div>
  );
}
