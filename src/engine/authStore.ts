import { create } from "zustand";
import {
  firebaseEnabled,
  signIn,
  signOutUser,
  signUp,
  watchAuthState,
  type User,
} from "./firebase";

interface AuthState {
  enabled: boolean;
  status: "loading" | "signed-out" | "signed-in";
  user: User | null;
  error: string | null;
  busy: boolean;
  init: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let initialized = false;

function friendlyError(err: unknown): string {
  const code = (err as { code?: string } | undefined)?.code ?? "";
  if (code.includes("email-already-in-use")) return "That email already has an account — try signing in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Incorrect email or password.";
  if (code.includes("user-not-found")) return "No account found for that email.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email address.";
  return err instanceof Error ? err.message : "Something went wrong — try again.";
}

export const useAuthStore = create<AuthState>((set) => ({
  enabled: firebaseEnabled,
  status: firebaseEnabled ? "loading" : "signed-out",
  user: null,
  error: null,
  busy: false,

  init: () => {
    if (initialized || !firebaseEnabled) return;
    initialized = true;
    watchAuthState((user) => {
      set({ user, status: user ? "signed-in" : "signed-out" });
    });
  },

  signUp: async (email, password) => {
    set({ busy: true, error: null });
    try {
      await signUp(email, password);
    } catch (err) {
      set({ error: friendlyError(err) });
    } finally {
      set({ busy: false });
    }
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    try {
      await signIn(email, password);
    } catch (err) {
      set({ error: friendlyError(err) });
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    await signOutUser();
  },

  clearError: () => set({ error: null }),
}));
