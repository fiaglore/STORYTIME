# STORYTIME: Lagos

Narrative choice game, companion to the book "What Is It About Lagos".
Design doc: docs/design.md. Read it before changing game rules.

## Stack

- Vite + React + TypeScript, Zustand for state
- Ink chapter scripts in chapters/, compiled to src/content/compiled/*.json
  by `npm run compile:ink` (runs automatically before `dev` and `build`),
  run in the browser with inkjs
- idb-keyval for saves (IndexedDB), localStorage only for the age-gate flag
- vite-plugin-pwa; deployed to GitHub Pages by .github/workflows/deploy.yml

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
  before the choice set; `StoryScreen.tsx` dispatches on that tag.
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
- Run `npm test` and `npm run build` before finishing any task.

## Repo layout

```
chapters/*.ink              one Ink file per chapter (source of truth)
scripts/compile-ink.mjs     compiles chapters/*.ink -> src/content/compiled/*.json
src/engine/                 inkRunner (React hook wrapping inkjs), Zustand store, saves
src/scenes/                 mini-scene React components (frying, change-making, ...)
src/ui/                     map hub, story screen, endings gallery, settings, etc.
src/content/                chapter metadata (chapters.json), glossary.json, compiled ink JSON
tests/                      Vitest engine tests + a manual Playwright e2e smoke script
```

## Adding a new chapter

1. Write `chapters/0N-slug.ink` (see `01-the-grind.ink` for the tag
   conventions: `# scene:`, `# ending_id:`, `# ending:`, `# verdict:`,
   `# book_canon`).
2. Run `npm run compile:ink` and fix any compiler errors/warnings.
3. Add the chapter's entry to `src/content/chapters.json` (id must match
   the ink filename without extension; endings array must match the
   `ending_id` tags used).
4. If the chapter needs a mini-scene, add it to `src/scenes/` and wire the
   tag name into `StoryScreen.tsx`'s scene dispatch.
5. Add a Vitest file under `tests/` that drives every ending to completion,
   following `tests/the-grind.test.ts`.
