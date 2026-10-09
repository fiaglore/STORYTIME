import { create } from "zustand";
import {
  defaultSave,
  loadSave,
  writeSave,
  type ChapterProgress,
  type SaveData,
} from "./saves";

interface GameState extends SaveData {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markChapterEnding: (chapterId: string, endingId: string) => void;
  setFlag: (key: string, value: string) => void;
  getFlag: (key: string) => string | undefined;
  updateSettings: (settings: Partial<SaveData["settings"]>) => void;
  replaceSave: (data: SaveData) => void;
}

// Only the plain-data fields are cloneable into IndexedDB — the store also
// carries action functions (hydrate, setFlag, ...) that must never be passed
// through to writeSave.
function persist(state: SaveData) {
  const { version, progress, flags, settings } = state;
  void writeSave({ version, progress, flags, settings });
}

export const useGameStore = create<GameState>((set, get) => ({
  ...structuredClone(defaultSave),
  hydrated: false,

  hydrate: async () => {
    const data = await loadSave();
    set({ ...data, hydrated: true });
  },

  markChapterEnding: (chapterId, endingId) => {
    set((state) => {
      const prior: ChapterProgress = state.progress[chapterId] ?? {
        finished: false,
        endingsFound: [],
      };
      const endingsFound = prior.endingsFound.includes(endingId)
        ? prior.endingsFound
        : [...prior.endingsFound, endingId];
      const nextProgress = {
        ...state.progress,
        [chapterId]: { finished: true, endingsFound },
      };
      const next = { ...state, progress: nextProgress };
      persist(next);
      return next;
    });
  },

  setFlag: (key, value) => {
    set((state) => {
      const next = { ...state, flags: { ...state.flags, [key]: value } };
      persist(next);
      return next;
    });
  },

  getFlag: (key) => get().flags[key],

  updateSettings: (settings) => {
    set((state) => {
      const next = { ...state, settings: { ...state.settings, ...settings } };
      persist(next);
      return next;
    });
  },

  replaceSave: (data) => {
    set({ ...data, hydrated: true });
    persist(data);
  },
}));
