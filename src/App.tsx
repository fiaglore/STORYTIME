import { useEffect, useState } from "react";
import { useGameStore } from "./engine/store";
import { TitleScreen } from "./ui/TitleScreen";
import { MapHub } from "./ui/MapHub";
import { StorytimeOpening } from "./ui/StorytimeOpening";
import { RpgMap } from "./ui/RpgMap";
import { LifeSim } from "./ui/LifeSim";
import { EndingScreen } from "./ui/EndingScreen";
import { EndingsGallery } from "./ui/EndingsGallery";
import { Settings } from "./ui/Settings";
import type { Chapter } from "./content/types";
import type { EndingInfo } from "./engine/inkRunner";
import "./app.css";

// All compiled chapter JSON files, keyed by filename, loaded eagerly.
// Only chapters that have finished scripts (chapters/*.ink) produce a file
// here; chapters still in design show as locked/"coming soon" in the UI.
const compiledChapters = import.meta.glob("./content/compiled/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function findCompiledStory(inkFile: string): unknown | null {
  const entry = Object.entries(compiledChapters).find(([path]) =>
    path.endsWith(`/${inkFile}`),
  );
  return entry ? entry[1] : null;
}

type Screen =
  | { name: "title" }
  | { name: "map" }
  | { name: "opening"; chapter: Chapter }
  | { name: "story"; chapter: Chapter; storyJson: unknown }
  | { name: "ending"; chapter: Chapter; ending: EndingInfo }
  | { name: "gallery" }
  | { name: "settings" }
  | { name: "lifesim" };

export default function App() {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);
  const markChapterEnding = useGameStore((s) => s.markChapterEnding);
  const [screen, setScreen] = useState<Screen>({ name: "title" });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <div className="app-loading">Loading Lagos…</div>;
  }

  const goToMap = () => setScreen({ name: "map" });
  const goToTitle = () => setScreen({ name: "title" });

  const selectChapter = (chapter: Chapter) => {
    const storyJson = findCompiledStory(chapter.inkFile);
    if (!storyJson) {
      alert(`${chapter.title} is still being written — check back soon.`);
      return;
    }
    setScreen({ name: "opening", chapter });
  };

  const beginChapter = (chapter: Chapter) => {
    const storyJson = findCompiledStory(chapter.inkFile);
    if (!storyJson) return goToMap();
    setScreen({ name: "story", chapter, storyJson });
  };

  const handleEnding = (chapter: Chapter, ending: EndingInfo) => {
    markChapterEnding(chapter.id, ending.id);
    setScreen({ name: "ending", chapter, ending });
  };

  switch (screen.name) {
    case "title":
      return (
        <TitleScreen
          onEnterStories={goToMap}
          onEnterLife={() => setScreen({ name: "lifesim" })}
        />
      );

    case "map":
      return (
        <MapHub
          onSelect={selectChapter}
          onOpenEndings={() => setScreen({ name: "gallery" })}
          onOpenSettings={() => setScreen({ name: "settings" })}
        />
      );

    case "opening":
      return (
        <StorytimeOpening
          chapterTitle={screen.chapter.title}
          protagonist={screen.chapter.protagonist}
          onDone={() => beginChapter(screen.chapter)}
        />
      );

    case "story":
      return (
        <RpgMap
          chapter={screen.chapter}
          storyJson={screen.storyJson}
          onEnding={(ending) => handleEnding(screen.chapter, ending)}
          onExit={goToMap}
        />
      );

    case "ending":
      return (
        <EndingScreen
          chapter={screen.chapter}
          ending={screen.ending}
          onMap={goToMap}
          onReplay={() => setScreen({ name: "opening", chapter: screen.chapter })}
        />
      );

    case "gallery":
      return <EndingsGallery onBack={goToMap} />;

    case "settings":
      return <Settings onBack={goToMap} />;

    case "lifesim":
      return <LifeSim onExit={goToTitle} />;

    default:
      return null;
  }
}
