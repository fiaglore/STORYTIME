import type { FirebaseOptions } from "firebase/app";
import type { User } from "firebase/auth";

// All of these are public client identifiers (not secrets) per Firebase's
// own docs — real access control lives in Firestore security rules, not in
// hiding this config. Still loaded from env vars rather than hardcoded so
// the repo works against any Firebase project without code changes.
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export type { User };

// The firebase/* packages are only dynamically imported here, and only
// once firebaseEnabled is true and something actually calls one of these
// functions. Deployments that don't configure Firebase (no env vars) never
// download any of this — and even configured deployments don't pay for it
// in the main bundle, only when a user opens Settings/Lagos Life and the
// AccountSection mounts. This matters: a static top-level import of
// firebase/app + firebase/auth + firebase/firestore nearly tripled the
// gzipped bundle size (109KB -> 281KB) for a PWA that's meant to work
// fully offline for players who never touch cloud save.
let modulesPromise: Promise<{
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
  authMod: typeof import("firebase/auth");
  firestoreMod: typeof import("firebase/firestore");
}> | null = null;

function loadFirebase() {
  if (!firebaseEnabled) {
    throw new Error("Cloud save isn't configured for this deployment yet.");
  }
  if (!modulesPromise) {
    modulesPromise = (async () => {
      const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      const app = initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);
      const db = firestoreMod.getFirestore(app);
      return { auth, db, authMod, firestoreMod };
    })();
  }
  return modulesPromise;
}

export function watchAuthState(callback: (user: User | null) => void): () => void {
  if (!firebaseEnabled) {
    callback(null);
    return () => {};
  }
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void loadFirebase().then(({ auth, authMod }) => {
    if (cancelled) return;
    unsubscribe = authMod.onAuthStateChanged(auth, callback);
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function signUp(email: string, password: string): Promise<User> {
  const { auth, authMod } = await loadFirebase();
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { auth, authMod } = await loadFirebase();
  const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!firebaseEnabled) return;
  const { auth, authMod } = await loadFirebase();
  await authMod.signOut(auth);
}

// One document per user, holding both game modes' save data. Each mode
// writes/reads its own top-level field so the two stay independent, per
// CLAUDE.md's "don't assume one mode when working on the other."
export interface CloudSave {
  storyProgress?: unknown;
  lifeSim?: unknown;
  updatedAt?: number;
}

export async function fetchCloudSave(uid: string): Promise<CloudSave | null> {
  if (!firebaseEnabled) return null;
  const { db, firestoreMod } = await loadFirebase();
  const snap = await firestoreMod.getDoc(firestoreMod.doc(db, "users", uid));
  return snap.exists() ? (snap.data() as CloudSave) : null;
}

export async function writeCloudSave(uid: string, patch: Partial<CloudSave>): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.setDoc(
    firestoreMod.doc(db, "users", uid),
    { ...patch, updatedAt: Date.now() },
    { merge: true },
  );
}
