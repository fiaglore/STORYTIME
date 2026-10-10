# STORYTIME: What Is It About Lagos?

A web-based narrative choice game in seven playable chapters, one per
story in the book *What Is It About Lagos*, played as a small 2D top-down
RPG: walk your character around a pixel-art scene and interact with
people to make each story's choices. Every choice costs you money (Naira)
or costs you yourself (Spirit).

Full design document: [`docs/design.md`](docs/design.md) (exported from
the original GDD PDF, also kept at `docs/design.pdf`).

The title screen offers two separate modes: **Play the stories** (the
book chapters above) and **Live a Lagos life** — a BitLife-style
procedural life sim where you age up year by year through random
Lagos-flavored events (school, hustle, family, the city), independent of
the book's chapters.

**Status:** Chapter 1, "The Grind" (Mama Ngozi), is fully playable with
all four endings. Chapters 2–7 are designed in `docs/design.md` but not
yet scripted — see the Build roadmap section there. Lagos Life mode has a
real, replayable core loop (aging, random events, jobs, death/new life)
with ~20 events across childhood/teen/adult years.

## Running locally

```bash
npm install
npm run dev
```

This compiles `chapters/*.ink` to `src/content/compiled/*.json` first
(via the `predev` script), then starts Vite on http://localhost:5173.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Compile Ink, then start the dev server |
| `npm run build` | Compile Ink, type-check, and build the production bundle to `dist/` |
| `npm run preview` | Serve the built `dist/` locally, at the same `/STORYTIME/` base path GitHub Pages uses |
| `npm test` | Run the Vitest suite — drives the compiled Ink directly to prove every ending in Chapter 1 is reachable, plus pure-function tests for the Lagos Life engine |
| `npm run compile:ink` | Compile `chapters/*.ink` to `src/content/compiled/*.json` on its own |
| `npm run lint` | Oxlint |

There are also two manual Playwright smoke tests that play a golden path
in a real browser against a running preview server — `tests/e2e-smoke.mjs`
for story mode, `scripts/smoke-lifesim.mjs` for Lagos Life mode; see the
comment at the top of each file for how to run it.

## How a chapter is built

Story text and branching logic live entirely in `chapters/*.ink`, written
in [Ink](https://www.inklestudios.com/ink/). The React app
(`src/ui/RpgMap.tsx`) never hard-codes narrative text — it just reads
whatever the current Ink line, choices and tagged meters are, via the
`useInkStory` hook in `src/engine/inkRunner.ts`, and renders them as a
dialogue panel the player opens by walking their pixel-art figurine to
the right spot on the map.

A few conventions, also documented in `CLAUDE.md`:

- `# scene: <name>` tags on an Ink line before a choice set swap in a
  mini-scene component (`src/scenes/`) for that choice point.
- `# stage: <charId>@<bgLocation>` says which character sprite is visible
  and `# spot: <hotspotId>` says which map hotspot the player must reach
  to open that knot's dialogue — both parsed the same way in
  `inkRunner.ts`. `hotspotId` must exist in `RpgMap.tsx`'s `HOTSPOTS` map.
- `# ending_id: <id>`, `# ending: <Title>`, `# verdict: <...>` and
  `# book_canon` tags mark an ending; `ending_id` must match an id in
  `src/content/chapters.json`.
- Every declared numeric Ink variable becomes a meter automatically — no
  separate React wiring needed per chapter.

## Deployment

`.github/workflows/deploy.yml` builds, tests and publishes `dist/` to
GitHub Pages on every push to `main`.

## License

Game code built as a companion to the book *What Is It About Lagos*.
