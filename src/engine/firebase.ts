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

// Live "other players visible on the map" presence. One doc per signed-in
// user (doc id = uid) in a separate top-level `presence` collection — never
// mixed into their `users/{uid}` save document, since this is ephemeral and
// world-readable (see firestore.rules) while the save doc is private.
export interface PresenceDoc {
  uid: string;
  chapterId: string;
  x: number;
  y: number;
  label: string;
  updatedAt: number;
}

// A presence doc older than this is treated as a stale/abandoned session
// (closed tab, lost network) rather than a currently-online player, since
// there's no reliable "I'm leaving" signal from a closed browser tab.
export const PRESENCE_STALE_MS = 20_000;

export async function writePresence(
  uid: string,
  data: Omit<PresenceDoc, "uid" | "updatedAt">,
): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.setDoc(firestoreMod.doc(db, "presence", uid), { ...data, updatedAt: Date.now() });
}

export async function clearPresence(uid: string): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.deleteDoc(firestoreMod.doc(db, "presence", uid));
}

// Streams other players currently in the same chapter (excludes uidToExclude
// — the local player's own doc). Stale docs (see PRESENCE_STALE_MS) are
// filtered out client-side rather than relying on every client to clean up
// after itself, since a closed tab never gets the chance to.
export function watchPresence(
  chapterId: string,
  uidToExclude: string,
  callback: (players: PresenceDoc[]) => void,
): () => void {
  if (!firebaseEnabled) {
    callback([]);
    return () => {};
  }
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void loadFirebase().then(({ db, firestoreMod }) => {
    if (cancelled) return;
    const q = firestoreMod.query(
      firestoreMod.collection(db, "presence"),
      firestoreMod.where("chapterId", "==", chapterId),
    );
    unsubscribe = firestoreMod.onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const players: PresenceDoc[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Omit<PresenceDoc, "uid">;
          if (docSnap.id === uidToExclude) return;
          if (now - data.updatedAt > PRESENCE_STALE_MS) return;
          players.push({ uid: docSnap.id, ...data });
        });
        callback(players);
      },
      // Fails open rather than throwing — e.g. firestore.rules hasn't been
      // republished with the presence/{uid} block yet on this deployment.
      // Other players just don't show up; nothing else in the app depends
      // on presence working.
      () => callback([]),
    );
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// Live "other Lagos Life players currently playing" presence — a separate
// collection from the story-mode `presence` above (different game mode,
// different shape, no chapterId), used for the marriage/chat "nearby
// players" list. Same stale-doc handling as watchPresence.
export interface LifeSimPresenceDoc {
  uid: string;
  characterName: string;
  age: number;
  updatedAt: number;
}

export async function writeLifeSimPresence(
  uid: string,
  data: Omit<LifeSimPresenceDoc, "uid" | "updatedAt">,
): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.setDoc(firestoreMod.doc(db, "lifesimPresence", uid), { ...data, updatedAt: Date.now() });
}

export async function clearLifeSimPresence(uid: string): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.deleteDoc(firestoreMod.doc(db, "lifesimPresence", uid));
}

export function watchLifeSimPresence(
  uidToExclude: string,
  callback: (players: LifeSimPresenceDoc[]) => void,
): () => void {
  if (!firebaseEnabled) {
    callback([]);
    return () => {};
  }
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void loadFirebase().then(({ db, firestoreMod }) => {
    if (cancelled) return;
    unsubscribe = firestoreMod.onSnapshot(
      firestoreMod.collection(db, "lifesimPresence"),
      (snap) => {
        const now = Date.now();
        const players: LifeSimPresenceDoc[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Omit<LifeSimPresenceDoc, "uid">;
          if (docSnap.id === uidToExclude) return;
          if (now - data.updatedAt > PRESENCE_STALE_MS) return;
          players.push({ uid: docSnap.id, ...data });
        });
        callback(players);
      },
      () => callback([]),
    );
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// Marriage proposals between two real players. A pending proposal is
// readable/updatable by both the sender and recipient (see
// firestore.rules); only the recipient is meant to accept/decline it
// (enforced by the UI, not by rules — either side could technically flip
// it, which is an acceptable trust level for a cosmetic social feature
// with no real-world stakes). Once accepted, BOTH clients independently
// call lifeSim.ts's marry() and persist their own character — see
// CLAUDE.md's "Marriage" section for why neither side writes the other's
// save document directly.
export interface MarriageProposalDoc {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export async function proposeMarriage(
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string,
): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.addDoc(firestoreMod.collection(db, "marriageProposals"), {
    fromUid,
    fromName,
    toUid,
    toName,
    status: "pending",
    createdAt: Date.now(),
  });
}

export async function respondToProposal(proposalId: string, accept: boolean): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.updateDoc(firestoreMod.doc(db, "marriageProposals", proposalId), {
    status: accept ? "accepted" : "declined",
  });
}

function watchProposalsWhere(
  field: "toUid" | "fromUid",
  uid: string,
  callback: (proposals: MarriageProposalDoc[]) => void,
): () => void {
  if (!firebaseEnabled) {
    callback([]);
    return () => {};
  }
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void loadFirebase().then(({ db, firestoreMod }) => {
    if (cancelled) return;
    const q = firestoreMod.query(firestoreMod.collection(db, "marriageProposals"), firestoreMod.where(field, "==", uid));
    unsubscribe = firestoreMod.onSnapshot(
      q,
      (snap) => {
        const proposals: MarriageProposalDoc[] = [];
        snap.forEach((docSnap) => proposals.push({ id: docSnap.id, ...(docSnap.data() as Omit<MarriageProposalDoc, "id">) }));
        callback(proposals);
      },
      () => callback([]),
    );
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export function watchIncomingProposals(uid: string, callback: (proposals: MarriageProposalDoc[]) => void): () => void {
  return watchProposalsWhere("toUid", uid, callback);
}

export function watchOutgoingProposals(uid: string, callback: (proposals: MarriageProposalDoc[]) => void): () => void {
  return watchProposalsWhere("fromUid", uid, callback);
}

// Pairwise chat. chatId is a deterministic sort of the two uids so both
// sides always land on the same chat document without a lookup step.
export function chatIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export interface ChatMessageDoc {
  id: string;
  fromUid: string;
  text: string;
  createdAt: number;
}

// Creates the parent chat doc (idempotent — merge: true) the first time
// two players message each other, so each side's "my chats" list (not
// currently built, but the participants field supports it later) has
// something to query. The actual messages live in the messages
// subcollection, not on this doc.
async function ensureChat(uidA: string, uidB: string): Promise<string> {
  const { db, firestoreMod } = await loadFirebase();
  const chatId = chatIdFor(uidA, uidB);
  await firestoreMod.setDoc(
    firestoreMod.doc(db, "chats", chatId),
    { participants: [uidA, uidB].sort(), updatedAt: Date.now() },
    { merge: true },
  );
  return chatId;
}

// No profanity filter, rate limit or block check happens in this
// function — those are the caller's responsibility (see
// src/engine/profanityFilter.ts and LifeSim.tsx's send handler) so this
// stays a thin, honest "write this message" primitive.
export async function sendChatMessage(fromUid: string, toUid: string, text: string): Promise<void> {
  if (!firebaseEnabled) return;
  const chatId = await ensureChat(fromUid, toUid);
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.addDoc(firestoreMod.collection(db, "chats", chatId, "messages"), {
    fromUid,
    text,
    createdAt: Date.now(),
  });
  await firestoreMod.setDoc(firestoreMod.doc(db, "chats", chatId), { updatedAt: Date.now() }, { merge: true });
}

const MESSAGE_HISTORY_LIMIT = 100;

export function watchChatMessages(
  uidA: string,
  uidB: string,
  callback: (messages: ChatMessageDoc[]) => void,
): () => void {
  if (!firebaseEnabled) {
    callback([]);
    return () => {};
  }
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  void loadFirebase().then(({ db, firestoreMod }) => {
    if (cancelled) return;
    const chatId = chatIdFor(uidA, uidB);
    const q = firestoreMod.query(
      firestoreMod.collection(db, "chats", chatId, "messages"),
      firestoreMod.orderBy("createdAt", "asc"),
      firestoreMod.limitToLast(MESSAGE_HISTORY_LIMIT),
    );
    unsubscribe = firestoreMod.onSnapshot(
      q,
      (snap) => {
        const messages: ChatMessageDoc[] = [];
        snap.forEach((docSnap) => messages.push({ id: docSnap.id, ...(docSnap.data() as Omit<ChatMessageDoc, "id">) }));
        callback(messages);
      },
      () => callback([]),
    );
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// Reports are write-only from the client (firestore.rules denies read) —
// there's no in-app moderation panel in this build, so a report is
// captured for the project owner to review manually via the Firebase
// console, not acted on automatically. Documented explicitly in
// CLAUDE.md so this limitation isn't mistaken for real-time moderation.
export async function reportMessage(reporterUid: string, reportedUid: string, chatId: string, text: string): Promise<void> {
  if (!firebaseEnabled) return;
  const { db, firestoreMod } = await loadFirebase();
  await firestoreMod.addDoc(firestoreMod.collection(db, "reports"), {
    reporterUid,
    reportedUid,
    chatId,
    text,
    createdAt: Date.now(),
  });
}
