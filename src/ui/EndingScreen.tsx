import type { EndingInfo } from "../engine/inkRunner";
import type { Chapter } from "../content/types";

interface Props {
  chapter: Chapter;
  ending: EndingInfo;
  onMap: () => void;
  onReplay: () => void;
}

export function EndingScreen({ chapter, ending, onMap, onReplay }: Props) {
  return (
    <div
      className="ending-screen"
      style={{ ["--chapter-accent" as string]: chapter.color }}
    >
      {ending.bookCanon && <p className="ending-screen__badge">📖 As Written in the book</p>}
      <h1 className="ending-screen__title">{ending.title}</h1>
      <p className="ending-screen__chapter">{chapter.title} — {chapter.protagonist}</p>
      <p className="ending-screen__verdict">{ending.verdict}</p>

      {ending.bookCanon && (
        <p className="ending-screen__book-link">
          This is how it ends in <em>What Is It About Lagos</em>.
        </p>
      )}

      <div className="ending-screen__actions">
        <button className="choice-button" onClick={onReplay}>
          Replay this chapter
        </button>
        <button className="choice-button choice-button--primary" onClick={onMap}>
          Back to the map
        </button>
      </div>
    </div>
  );
}
