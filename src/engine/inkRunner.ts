import { useEffect, useMemo, useRef, useState } from "react";
import { Story } from "inkjs";

export interface StoryLine {
  text: string;
  tags: string[];
}

export interface StoryChoice {
  index: number;
  text: string;
}

export interface EndingInfo {
  id: string;
  title: string;
  verdict: string;
  bookCanon: boolean;
}

export type MeterSnapshot = Record<string, number>;

// Variables the engine watches for automatically, per the design doc's
// shared meters (naira, spirit) plus whatever chapter-specific numeric
// variables a chapter's .ink file declares (profit, solidarity, ...).
function readAllNumberVariables(story: Story): MeterSnapshot {
  const snapshot: MeterSnapshot = {};
  const variablesState = story.variablesState as unknown as {
    $: (name: string) => unknown;
    _defaultGlobalVariables: Map<string, unknown>;
  };
  for (const name of variablesState._defaultGlobalVariables.keys()) {
    const value = variablesState.$(name);
    if (typeof value === "number") snapshot[name] = value;
  }
  return snapshot;
}

function parseTaggedLine(tags: string[], prefix: string): string | null {
  const found = tags.find((t) => t.trim().startsWith(prefix));
  if (!found) return null;
  return found.slice(found.indexOf(":") + 1).trim();
}

export interface InkStoryState {
  ready: boolean;
  lines: StoryLine[];
  choices: StoryChoice[];
  meters: MeterSnapshot;
  sceneTag: string | null;
  stageTag: string | null;
  ending: EndingInfo | null;
  error: string | null;
  choose: (index: number) => void;
  restart: () => void;
}

export function useInkStory(
  storyJson: unknown,
  initialVariables?: Record<string, string | number>,
): InkStoryState {
  const storyRef = useRef<Story | null>(null);
  const [lines, setLines] = useState<StoryLine[]>([]);
  const [choices, setChoices] = useState<StoryChoice[]>([]);
  const [meters, setMeters] = useState<MeterSnapshot>({});
  const [sceneTag, setSceneTag] = useState<string | null>(null);
  const [stageTag, setStageTag] = useState<string | null>(null);
  const [ending, setEnding] = useState<EndingInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);

  const advance = useMemo(
    () => (story: Story) => {
      const collected: StoryLine[] = [];
      let lastSceneTag: string | null = null;
      let lastStageTag: string | null = null;
      let foundEnding: EndingInfo | null = null;

      try {
        while (story.canContinue) {
          const text = story.Continue() ?? "";
          const tags = story.currentTags ?? [];
          // Each tag kind is tracked independently (not just "the last
          // line's tags") because a later line may carry one tag kind
          // without the other — e.g. a scene: tag with no stage: tag on
          // the same line shouldn't clear a stage set earlier.
          const scene = parseTaggedLine(tags, "scene:");
          if (scene) lastSceneTag = scene;
          const stage = parseTaggedLine(tags, "stage:");
          if (stage) lastStageTag = stage;
          if (text.trim().length > 0) {
            collected.push({ text: text.trim(), tags });
          }
          const endingTitle = parseTaggedLine(tags, "ending:");
          if (endingTitle) {
            foundEnding = {
              id: parseTaggedLine(tags, "ending_id:") ?? endingTitle,
              title: endingTitle,
              verdict: parseTaggedLine(tags, "verdict:") ?? "",
              bookCanon: tags.some((t) => t.trim() === "book_canon"),
            };
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return;
      }

      setLines(collected);
      setSceneTag(lastSceneTag);
      setStageTag(lastStageTag);
      setMeters(readAllNumberVariables(story));

      if (foundEnding) {
        setEnding(foundEnding);
        setChoices([]);
      } else {
        setEnding(null);
        setChoices(story.currentChoices.map((c, i) => ({ index: i, text: c.text })));
      }
    },
    [],
  );

  useEffect(() => {
    setError(null);
    setEnding(null);
    try {
      const story = new Story(storyJson as ConstructorParameters<typeof Story>[0]);
      storyRef.current = story;
      if (initialVariables) {
        for (const [key, value] of Object.entries(initialVariables)) {
          try {
            (story.variablesState as unknown as { $: (n: string, v: unknown) => void }).$(key, value);
          } catch {
            // Chapter doesn't declare this variable — fine, it's optional.
          }
        }
      }
      setReady(true);
      advance(story);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyJson, resetCount]);

  const choose = (index: number) => {
    const story = storyRef.current;
    if (!story) return;
    story.ChooseChoiceIndex(index);
    advance(story);
  };

  const restart = () => setResetCount((n) => n + 1);

  return { ready, lines, choices, meters, sceneTag, stageTag, ending, error, choose, restart };
}
