# What Is It About Lagos?

A BitLife-style procedural life sim set in Lagos: age up year by year
through a pool of random Lagos-flavored events, no Ink/chapters or book
tie-in — this used to be a companion app to a book's Ink-scripted
chapters, but that "Play the stories" mode has been removed from this
repo entirely (it's now a separate project). Everything in this repo is
the single surviving mode, `src/ui/LifeSim.tsx`.

## Stack

- Vite + React + TypeScript, Zustand for auth state only (`authStore.ts`)
  — the life sim itself uses plain React `useState` in `LifeSim.tsx`, not
  Zustand
- vite-plugin-pwa; deployed to GitHub Pages by .github/workflows/deploy.yml
- Firebase (Auth + Firestore) for optional cloud save/sign-in and
  player-to-player features — see "Firebase / cloud save" below. Entirely
  optional: with no config, the game works exactly as before, fully local.

## Rules

- Character creation (`src/ui/LifeSim.tsx`'s `!character` screen) is a
  multi-step flow: name → date of birth → faith → three random "important
  questions" from `src/content/characterCreation.ts`'s `CREATION_QUESTIONS`
  pool → a reveal screen. `rollWealthTier` in `lifeSim.ts` sums the three
  answers' scores plus a random nudge and maps the total onto
  `WEALTH_TIERS` (shepeteri → famous, ordered low to high) to pick both the
  Lagos-slang tier label and a concrete one-time inheritance amount inside
  that tier's naira range — "assigned randomly from the information
  gathered at sign in" per the design ask, not a deterministic lookup.
  `createCharacter` takes this (plus name/birthDate/faith) as an options
  object now, not just a name string — everybody still starts at the same
  base stats (happiness/health/smarts/looks roll the same ranges
  regardless of tier), only the starting naira and tier label differ.
  `birthDate`/`faith` are stored on `LifeCharacter` but are flavor/display
  only — age still starts at 0 and advances via Age Up regardless of the
  chosen birth date.
- Lagos Life mode (`src/engine/lifeSim.ts` + `src/content/lifeEvents.ts`)
  is plain TypeScript. Add new random events to the `LIFE_EVENTS` array in
  `lifeEvents.ts` (pick the right `AgeBand`s; the "infant" band
  intentionally has no events — babies don't make choices). Keep the
  engine functions in `lifeSim.ts` pure (character in, character out) so
  they stay testable without a browser; see `tests/lifesim.test.ts`.
- `naira` is real Naira, not an abstract "k" unit — every cost in
  `lifeEvents.ts` and every job's `payPerYear` in `lifeSim.ts`'s `JOBS` is
  calibrated against a fuel price of NGN1,400/litre (see the math on the
  `generator-bill` event) and real Lagos income/cost ranges. Keep new
  content on that same real scale, and always format with
  `toLocaleString()` (`formatNaira` in `LifeSim.tsx`), never a bare number
  or a "k" suffix.
- Two gates make some choices genuinely hard to reach, not just a bigger
  number: `EventChoice.requiresAsset` (durable goods — you can't choose to
  run a generator you don't own) and `EventChoice.requiresNaira` (you can't
  choose to buy something you haven't saved enough for). `isChoiceAvailable`
  in `lifeSim.ts` is the single source of truth for both; `LifeSim.tsx`
  filters choices through it before rendering (an unavailable choice isn't
  shown at all, not shown-and-disabled) and `resolveEvent` refuses an
  unavailable choice too, so the engine can't be bypassed even if a caller
  skips the UI's filtering. `grantsAsset` on a choice adds that asset to
  `LifeCharacter.assets` once resolved — see the `generator-opportunity` /
  `generator-bill` pair of events for the full pattern (buy it once you can
  afford it, then and only then can you choose to run it). Follow this
  pattern for new hard-to-afford content rather than inventing another gate
  shape.
- `LifeCharacter.streak` is a once-a-year resilience counter (consecutive
  years health has stayed >= 30), ticked only in `ageUp` — not in
  `resolveEvent`. It used to tick in both, which let it roughly double-count
  within a single year (an "18-year streak" at age 18 turning into a
  nonsensical "29-year streak"); this was a real bug, see the comment above
  `resolveEvent`'s `next` object. Don't reintroduce a second tick point.
- Shared gamification UI lives in `src/ui/`: `useStatDeltas.ts` diffs a
  `{key: value}` map across renders into short-lived floating +N/-N popup
  events (used by `LifeSim.tsx` for its stats) — reuse it rather than
  re-implementing a diff/timeout dance per screen.
- `JobInterviewGame.tsx` is a timing mini-game (stop a sweeping marker in a
  target zone) shown before a Lagos Life job is confirmed; the job is
  granted regardless of the result, which only changes a one-time naira/
  happiness bonus — see `INTERVIEW_BONUS` in `LifeSim.tsx`.
- Shop (`src/content/shop.ts`) and skills (`src/content/skills.ts`) are
  Lagos Life's other two ways to spend naira. `buyItem`/`trainSkill` in
  `lifeSim.ts` are both "refuse rather than throw" (unaffordable or
  already-owned is a no-op, same pattern as `resolveEvent`'s gated
  choices). Skills aren't just flavor numbers — `Job.requiresSkill` gates
  which jobs `availableJobs` even offers (hawking has no requirement, so
  it's always the fallback); `takeJob` re-checks this itself too, same
  "can't be bypassed even if a caller skips the UI's filtering" principle
  as `resolveEvent`/`isChoiceAvailable`.
- Age Up also requires earning *and* spending a minimum amount of naira
  each year (`AGE_UP_REQUIREMENTS`, `meetsAgeUpRequirements`), on top of
  clearing that year's chores. `LifeCharacter.earnedThisYear`/
  `spentThisYear` reset at the start of each year in `ageUp` (job income,
  if any, becomes the new year's first earned contribution) and every
  naira-moving action feeds them via the shared `trackNaira` helper
  (chores, events, shop, skill training) — it tracks the *actual* change
  applied, after the naira-floors-at-0 clamp in `applyDelta`, not the raw
  delta requested. `hustle()` is a small, always-available, capped-per-year
  (`MAX_HUSTLES_PER_YEAR`) way to earn cash on demand, specifically so an
  unemployed character with an unlucky year (no money-earning event or
  chore) can never be soft-locked out of the earn requirement — **this was
  a real bug**: its first payout range could bottom out, across the full
  per-year cap, below the adult band's `minEarn`, meaning no amount of
  hustling could ever clear it for an unlucky character. If you touch
  `hustle`'s payout range or `MAX_HUSTLES_PER_YEAR` or
  `AGE_UP_REQUIREMENTS`, re-verify `worst-case hustle total >= hardest
  band's minEarn` still holds (there's a 50-trial regression test for
  this — keep it).
- Age Up is deliberately semi-tedious: `src/content/chores.ts`'s `CHORES`
  is a pool of small daily tasks (distinct from `LIFE_EVENTS`, which have
  real branching choices and bigger stakes); `pickChores(character,
  CHORES_PER_YEAR)` rolls a fresh set every time a year starts (character
  creation and every `ageUp`), and `LifeSim.tsx` won't show the Age Up
  button again until `pendingChores` is empty — see `resolveChore` in
  `lifeSim.ts`. A band with no chores in the pool (infancy) just gets an
  empty list, so Age Up stays immediate there; add new chores to the pool
  rather than raising `CHORES_PER_YEAR` if an age band needs more variety,
  so the friction doesn't come from repeating the same 2-3 chores over and
  over.
- `pickChores` filters on more than age band — a chore that assumes a
  specific economic reality (`maxNaira`: queuing to charge your phone
  implies no power at home; `minNaira`: having a driver to settle disputes
  between implies you can afford one; `requiresAsset`/`excludesAsset`:
  owning a generator means you don't queue at a charging kiosk, owning a
  borehole means you don't fetch water) only gets offered when that reality
  still holds for the character's current naira balance and `assets`. A
  character with ₦3.2M saved should never be offered "queue to charge your
  phone" — that was a real bug, chores used to be picked on age band alone.
  Any new chore that implies a particular standard of living needs one of
  these fields, not just a plausible-sounding `bands` entry.
- Run `npm test` and `npm run build` before finishing any task.

## Firebase / cloud save

Optional: if `VITE_FIREBASE_*` env vars aren't set, `firebaseEnabled` is
`false` and the game behaves exactly as before this feature existed
(localStorage only, no auth UI shown beyond a "cloud save isn't set up"
note in Lagos Life's intro screen).

- Config lives in `.env` (gitignored, local dev) or `.env.production`
  (committed — safe to commit: Firebase web config values aren't secrets,
  access control is enforced by `firestore.rules`, not by hiding these).
  See `.env.example` for the exact variable names, and the Firebase
  console path to find each one (Project settings -> your web app -> SDK
  setup and configuration).
- `firestore.rules` (repo root) must be pasted into Firebase Console ->
  Firestore Database -> Rules -> Publish every time it changes. It
  restricts each user to only read/write their own `users/{uid}` document
  — nothing in this repo enforces that except those rules, so don't skip
  publishing them.
- `src/engine/firebase.ts` lazy-loads the `firebase/*` packages via
  dynamic `import()`, only once something actually calls an auth/Firestore
  function (not at app boot, even when configured). A static top-level
  import of the SDK nearly tripled the gzipped main bundle (109KB ->
  281KB) for a PWA meant to work fully offline — don't reintroduce that by
  importing from `firebase/app`, `firebase/auth` or `firebase/firestore`
  anywhere outside this file.
- `src/engine/authStore.ts` is the single Zustand store for sign-in state.
  `src/ui/AccountSection.tsx` is the sign-in/sign-up/sign-out widget,
  embedded in Lagos Life's intro/settings screens.
- Cloud sync is "pull on sign-in, push on every local save": see the
  `uid`-keyed effect in `LifeSim.tsx`. There's no conflict resolution UI —
  whichever save the pull finds (cloud if present, else local) becomes
  authoritative for that device from then on.
- **Marriage** (`src/ui/LifeSimSocial.tsx`, the "Marriage" tab in
  `LifeSim.tsx`, shown once signed in and age >= 18): real player-to-player,
  not an NPC. `lifesimPresence/{uid}` (character name + age) drives the
  "nearby players" list; `marriageProposals/{id}` holds the propose/accept/
  decline flow. Neither side ever writes the other's `users/{uid}` save
  document — instead, once a proposal's `status` flips to `"accepted"`,
  **both** clients independently observe that (their own
  `watchIncomingProposals`/`watchOutgoingProposals` subscription sees it)
  and call `marry()` on their own character, persisting it themselves.
  This is why `marry()` is a plain local/pure function in `lifeSim.ts` with
  no Firestore call in it. `firestore.rules` needs its own
  `lifesimPresence/{uid}` and `marriageProposals/{id}` blocks (already in
  the repo's copy, needs publishing same as every other collection here).
- **Chat** (same `LifeSimSocial.tsx`): free-text, pairwise, any two
  players who can see each other in the nearby-players list (or a married
  spouse). `chatId` is a deterministic sort of the two uids
  (`chatIdFor`), so both sides land on the same `chats/{chatId}` doc with
  no lookup step; messages live in `chats/{chatId}/messages`. This ships
  with four **basic** safety rails, explicitly not a full moderation
  system:
  1. `src/engine/profanityFilter.ts` — a client-side word-list substring
     check before send. Catches overt profanity only; doesn't catch
     misspellings or other languages, and doesn't stop a client that
     calls `sendChatMessage` directly instead of going through the UI
     (there's no backend to enforce this server-side).
  2. A client-side send rate limit (`CHAT_RATE_LIMIT_MS` in
     `LifeSimSocial.tsx`) — same caveat, UI-layer only.
  3. Block (`LifeCharacter.blockedUids`, `blockPlayer`/`unblockPlayer` in
     `lifeSim.ts`) — entirely local, no Firestore write of its own. Hides
     a uid from the nearby-players list and filters their messages out of
     the chat view client-side; doesn't stop them from still writing to
     the chat document in Firestore.
  4. Report (`reportMessage`) — write-only from the client
     (`firestore.rules` denies read on `reports/{id}`). There is **no
     in-app moderation panel or automated action** — a report is captured
     for the project owner to review manually via the Firebase console.
     Don't describe chat to users as "moderated"; it isn't, beyond these
     four client-side layers.
  Keep this scope in mind before extending chat further: a backend
  (Cloud Functions or similar) would be needed for any of this to be
  enforced against a client that doesn't cooperate.

## Repo layout

```
firestore.rules             Firestore security rules (paste into Firebase console)
.env.example                Firebase config var names (copy to .env / .env.production)
scripts/smoke-lifesim.mjs   manual Playwright smoke test for the life sim
src/engine/                 lifeSim (pure life-sim engine), firebase.ts (lazy-loaded
                             Firebase SDK wrapper), authStore (sign-in state),
                             profanityFilter
src/ui/                     LifeSim (the whole game screen), LifeSimSocial (marriage +
                             chat), AccountSection (sign-in/up/out widget), TitleScreen
src/content/                lifeEvents.ts (life-sim event pool), chores.ts, shop.ts,
                             skills.ts
tests/                      Vitest engine tests + a manual Playwright smoke script
```
