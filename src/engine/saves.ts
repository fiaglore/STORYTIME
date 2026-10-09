import { get, set } from "idb-keyval";

export interface ChapterProgress {
  finished: boolean;
  endingsFound: string[];
}

export interface SaveData {
  version: 1;
  progress: Record<string, ChapterProgress>;
  flags: Record<string, string>;
  settings: {
    textSize: "small" | "medium" | "large";
    relaxedTiming: boolean;
    audioOn: boolean;
    pauseBeforeIntense: boolean;
  };
}

const SAVE_KEY = "storytime-lagos:save";

export const defaultSave: SaveData = {
  version: 1,
  progress: {},
  flags: {},
  settings: {
    textSize: "medium",
    relaxedTiming: false,
    audioOn: true,
    pauseBeforeIntense: true,
  },
};

export async function loadSave(): Promise<SaveData> {
  const existing = await get<SaveData>(SAVE_KEY);
  if (!existing) return structuredClone(defaultSave);
  return { ...structuredClone(defaultSave), ...existing };
}

export async function writeSave(data: SaveData): Promise<void> {
  await set(SAVE_KEY, data);
}

export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 2);
}

export function importSave(json: string): SaveData {
  const parsed = JSON.parse(json);
  return { ...structuredClone(defaultSave), ...parsed };
}
