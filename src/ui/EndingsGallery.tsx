import chapters from "../content/chapters.json";
import { useGameStore } from "../engine/store";
import type { Chapter } from "../content/types";

interface Props {
  onBack: () => void;
}

export function EndingsGallery({ onBack }: Props) {
  const progress = useGameStore((s) => s.progress);
  const list = chapters as Chapter[];

  return (
    <div className="endings-gallery">
      <header className="endings-gallery__header">
        <button className="icon-button" onClick={onBack} aria-label="Back to map">
          ←
        </button>
        <h1>Endings gallery</h1>
      </header>

      {list.map((chapter) => {
        const found = new Set(progress[chapter.id]?.endingsFound ?? []);
        return (
          <section key={chapter.id} className="endings-gallery__chapter">
            <h2 style={{ color: chapter.color }}>{chapter.title}</h2>
            <div className="endings-gallery__grid">
              {chapter.endings.length === 0 && (
                <p className="endings-gallery__placeholder">Coming soon.</p>
              )}
              {chapter.endings.map((ending) => {
                const isFound = found.has(ending.id);
                return (
                  <div
                    key={ending.id}
                    className={`ending-card ${isFound ? "ending-card--found" : "ending-card--locked"}`}
                  >
                    {isFound ? (
                      <>
                        <p className="ending-card__title">{ending.title}</p>
                        {ending.bookCanon && (
                          <p className="ending-card__badge">📖 As Written</p>
                        )}
                      </>
                    ) : (
                      <p className="ending-card__hint">Undiscovered ending</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
