# STORYTIME: What Is It About Lagos?

Narrative choice game, companion to the book "What Is It About Lagos".
Design doc: docs/design.md. Read it before changing game rules.

The app has two independent game modes, chosen from the title screen:
**Play the stories** (the book's 7 Ink-scripted chapters, see below) and
**Live a Lagos life** (`src/ui/LifeSim.tsx` — a BitLife-style procedural
life sim: age up year by year through a pool of random Lagos-flavored
events, no Ink/chapters involved). They share the app shell, brand
styling and localStorage-based persistence conventions, but are otherwise
separate systems — don't assume one when working on the other.

## Stack

- Vite + React + TypeScript, Zustand for state
- Ink chapter scripts in chapters/, compiled to src/content/compiled/*.json
  by `npm run compile:ink` (runs automatically before `dev` and `build`),
  run in the browser with inkjs
- idb-keyval for saves (IndexedDB), localStorage only for the age-gate flag
- vite-plugin-pwa; deployed to GitHub Pages by .github/workflows/deploy.yml
- Firebase (Auth + Firestore) for optional cloud save/sign-in — see
  "Firebase / cloud save" below. Entirely optional: with no config, both
  game modes work exactly as before, fully local.

## Rules

- Story text lives only in `chapters/*.ink`. Never hard-code story text in
  React — mini-scenes in `src/scenes/` only change how an ink choice set is
  *presented*, they never add branching logic of their own.
- Every chapter's ink file declares the shared meters `naira` and `spirit`
  (0–100) plus its own chapter meter(s). `src/engine/inkRunner.ts` reads
  every declared numeric Ink variable automatically — no React-side meter
  wiring needed when you add a new chapter meter.
- Endings are tagged in ink with `# ending_id: <id>`, `# ending: <Title>`,
  `# verdict: <...>`, and `# book_canon` on the As Written ending. The
  `ending_id` must match an id listed in `src/content/chapters.json` for
  that chapter.
- Mini-scenes are opted into with a `# scene: <name>` tag on the ink line
  before the choice set; `RpgMap.tsx` dispatches on that tag.
- Chapters are played as a 2D top-down RPG (`src/ui/RpgMap.tsx`), not a
  scrolling visual novel. A `# stage: <charId>@<bgLocation>` tag says who's
  visible and where; a `# spot: <hotspotId>` tag says which map hotspot is
  "active" — the player must walk/click there to open the dialogue panel
  for that knot's choices. `hotspotId` must be a key in `RpgMap.tsx`'s
  `HOTSPOTS` map (currently Chapter 1's Oshodi market layout only — a new
  chapter with a different setting needs its own hotspot map and
  background art, or a second RpgMap-like component).
- When a choice can lead to the *same* `spot` as the one just visited
  (e.g. two consecutive knots both at "stall"), close the dialogue via the
  choice handler itself, not an effect keyed on "did the spot id change" —
  it won't change, and the dialogue will stay stuck open. This was a real
  bug; see `handleChoose` in `RpgMap.tsx`.
- Keep Nigerian Pidgin dialogue exactly as written; add glossary entries in
  `src/content/glossary.json` (not yet wired into a tappable UI — see Open
  questions in the design doc).
- Cross-chapter flags are saved at chapter end and intended to be passed
  into the next chapter's Ink story at start (see `useGameStore.setFlag` /
  `getFlag`); only Chapter 1 exists today so this isn't exercised yet.
- Every ending must be reachable by an automated test. `tests/*.test.ts`
  drives the compiled Ink JSON directly (no browser needed) to prove every
  declared ending is reachable; see `tests/the-grind.test.ts` as the
  pattern for new chapters.
- Lagos Life mode (`src/engine/lifeSim.ts` + `src/content/lifeEvents.ts`)
  is plain TypeScript, no Ink involved. Add new random events to the
  `LIFE_EVENTS` array in `lifeEvents.ts` (pick the right `AgeBand`s; the
  "infant" band intentionally has no events — babies don't make choices).
  Keep the engine functions in `lifeSim.ts` pure (character in, character
  out) so they stay testable without a browser; see `tests/lifesim.test.ts`.
- Run `npm test` and `npm run build` before finishing any task.

## Firebase / cloud save

Optional: if `VITE_FIREBASE_*` env vars aren't set, `firebaseEnabled` is
`false` and both game modes behave exactly as before this feature existed
(IndexedDB / localStorage only, no auth UI shown beyond a "cloud save
isn't set up" note in Settings / Lagos Life's intro screen).

- Config lives in `.env` (gitignored, local dev) or `.env.production`
  (committed — safe to commit: Firebase web config values aren't secrets,
  access control is enforced by `firestore.rules`, not by hiding these).
  See `.env.example` for the exact variable names, and the Firebase
  console path to find each one (Project settings -> your web app -> SDK
  setup and configuration).
- `firestore.rules` (repo root) must be pasted into Firebase Console ->
  Firestore Database -> Rules -> Publish. It restricts each user to only
  read/write their own `users/{uid}` document — nothing in this repo
  enforces that except those rules, so don't skip publishing them.
- `src/engine/firebase.ts` lazy-loads the `firebase/*` packages via
  dynamic `import()`, only once something actually calls an auth/Firestore
  function (not at app boot, even when configured). A static top-level
  import of the SDK nearly tripled the gzipped main bundle (109KB ->
  281KB) for a PWA meant to work fully offline — don't reintroduce that by
  importing from `firebase/app`, `firebase/auth` or `firebase/firestore`
  anywhere outside this file.
- `src/engine/authStore.ts` is the single Zustand store for sign-in state,
  shared by both game modes. `src/ui/AccountSection.tsx` is the
  sign-in/sign-up/sign-out widget, embedded in both Settings (story mode)
  and Lagos Life's intro screen.
- Cloud sync is "pull on sign-in, push on every local save": see
  `useGameStore.syncFromCloud` (story mode, triggered from `App.tsx`) and
  the `uid`-keyed effect in `LifeSim.tsx`. There's no conflict resolution
  UI — whichever save the pull finds (cloud if present, else local)
  becomes authoritative for that device from then on.

## Repo layout

```
chapters/*.ink              one Ink file per chapter (source of truth)
firestore.rules             Firestore security rules (paste into Firebase console)
.env.example                Firebase config var names (copy to .env / .env.production)
scripts/compile-ink.mjs     compiles chapters/*.ink -> src/content/compiled/*.json
scripts/smoke-lifesim.mjs   manual Playwright smoke test for Lagos Life mode
src/engine/                 inkRunner (React hook wrapping inkjs), lifeSim (pure life-sim
                             engine), firebase.ts (lazy-loaded Firebase SDK wrapper),
                             authStore (sign-in state), Zustand store, saves
src/scenes/                 mini-scene React components (frying, change-making, ...)
src/ui/                     map hub, RpgMap (chapter play screen), LifeSim (life-sim mode),
                             AccountSection (sign-in/up/out widget),
                             endings gallery, settings, etc.
src/content/                chapter metadata (chapters.json), lifeEvents.ts (life-sim event
                             pool), glossary.json, compiled ink JSON
tests/                      Vitest engine tests (chapters + life sim) + a manual Playwright
                             e2e smoke script for story mode
```

## Adding a new chapter

1. Write `chapters/0N-slug.ink` (see `01-the-grind.ink` for the tag
   conventions: `# scene:`, `# ending_id:`, `# ending:`, `# verdict:`,
   `# book_canon`).
2. Run `npm run compile:ink` and fix any compiler errors/warnings.
3. Add the chapter's entry to `src/content/chapters.json` (id must match
   the ink filename without extension; endings array must match the
   `ending_id` tags used).
4. Add a hotspot map (location coordinates + a background image) for the
   chapter's setting, and wire `# spot:`/`# stage:` tags accordingly. If
   the chapter needs a mini-scene, add it to `src/scenes/` and wire the
   tag name into the scene dispatch.
5. Add a Vitest file under `tests/` that drives every ending to completion,
   following `tests/the-grind.test.ts`.
