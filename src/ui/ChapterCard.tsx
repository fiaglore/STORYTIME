import type { Chapter } from "../content/types";

interface Props {
  chapter: Chapter;
  unlocked: boolean;
  endingsFound: number;
  onPlay: () => void;
}

export function ChapterCard({ chapter, unlocked, endingsFound, onPlay }: Props) {
  if (!unlocked) {
    return (
      <div className="chapter-card chapter-card--locked">
        <div className="chapter-card__silhouette" aria-hidden="true" />
        <p className="chapter-card__locked-label">Story, story…</p>
      </div>
    );
  }

  return (
    <div
      className="chapter-card"
      style={{ ["--chapter-accent" as string]: chapter.color }}
    >
      <p className="chapter-card__number">Chapter {chapter.number}</p>
      <h3 className="chapter-card__title">{chapter.title}</h3>
      <p className="chapter-card__protagonist">{chapter.protagonist} · {chapter.location}</p>
      <p className="chapter-card__note">{chapter.contentNote}</p>
      <p className="chapter-card__endings">
        Endings found: {endingsFound} of {chapter.endings.length || "?"}
      </p>
      <button className="choice-button choice-button--play" onClick={onPlay}>
        Play
      </button>
    </div>
  );
}
