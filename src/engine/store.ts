import { create } from "zustand";
import {
  defaultSave,
  loadSave,
  writeSave,
  type ChapterProgress,
  type SaveData,
} from "./saves";
import { fetchCloudSave, writeCloudSave } from "./firebase";
import { useAuthStore } from "./authStore";

interface GameState extends SaveData {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markChapterEnding: (chapterId: string, endingId: string) => void;
  setFlag: (key: string, value: string) => void;
  getFlag: (key: string) => string | undefined;
  updateSettings: (settings: Partial<SaveData["settings"]>) => void;
  replaceSave: (data: SaveData) => void;
  syncFromCloud: (uid: string) => Promise<void>;
}

// Only the plain-data fields are cloneable into IndexedDB — the store also
// carries action functions (hydrate, setFlag, ...) that must never be passed
// through to writeSave.
function persist(state: SaveData) {
  const { version, progress, flags, settings } = state;
  const plain = { version, progress, flags, settings };
  void writeSave(plain);
  const uid = useAuthStore.getState().user?.uid;
  if (uid) void writeCloudSave(uid, { storyProgress: plain });
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

  // Called once on sign-in (see App.tsx): if the account already has cloud
  // progress, that becomes the local save (cloud is the source of truth
  // across devices); otherwise the current local save is the first thing
  // pushed up, via persist()'s own cloud write.
  syncFromCloud: async (uid) => {
    const cloud = await fetchCloudSave(uid);
    if (cloud?.storyProgress) {
      const data = cloud.storyProgress as SaveData;
      set({ ...defaultSave, ...data, hydrated: true });
      void writeSave({ ...defaultSave, ...data });
    } else {
      persist(get());
    }
  },
}));
