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
  multi-step flow: **auth** → name → date of birth → faith → three random
  questions → a reveal screen. The auth step comes first and is mandatory
  whenever cloud save is configured (`authEnabled`) — the `creationStep`
  effect auto-advances past it the moment `authStatus` is `"signed-in"`,
  or immediately if `!authEnabled` (nothing to sign into, so there's no
  gate to show). `pickCreationQuestions(3)` draws from
  `src/content/characterCreation.ts`'s `CREATION_QUESTIONS` pool — these
  are deliberately unrelated to wealth (birth day, lucky number, sleep
  habits, spirit animal, favorite color), per the design ask that the
  wealth tier feel like a dice roll, not a reflection of the player's
  answers. `rollWealthTier` in `lifeSim.ts` sums the three answers' scores
  plus a random nudge and maps the total onto `WEALTH_TIERS` (shepeteri →
  famous, ordered low to high) to pick both the Lagos-slang tier label and
  a concrete one-time inheritance amount inside that tier's naira range.
  `createCharacter` takes this (plus name/birthDate/faith) as an options
  object now, not just a name string — everybody still starts at the same
  base stats (happiness/health/smarts/looks roll the same ranges
  regardless of tier), only the starting naira and tier label differ.
  `birthDate`/`faith` are stored on `LifeCharacter` but are flavor/display
  only — age still starts at 0 and advances via Age Up regardless of the
  chosen birth date.
- A handful of event choices whose flavor text already describes real
  danger (racing an okada, defying armed robbers, chasing a thief into a
  crowd, taking cult "protection" money) carry an optional `risk` field
  (`EventRisk` in `lifeEvents.ts`) resolved once in `resolveEvent` on top
  of the choice's normal delta: `chance` is the odds the risk fires at
  all, `fatalShare` is the odds (of those) it's fatal rather than a
  maiming. A fatal roll overrides the choice's own result line with the
  risk's `deathResult` and kills the character exactly like a natural
  `checkDeath` death; a maiming roll applies an extra harsh `StatDelta`
  (big health/looks hit) and appends `maimResult` to the normal result
  line — the character stays alive. Both are recoverable for naira:
  `reviveCharacter`/`REVIVE_COST` brings a dead character back (shown as a
  "Pay to revive" button on the obituary screen, only when affordable).
  If the death was from old age (`age >= lifespan`), reviving also
  extends `lifespan` by a random 5-10 years — without this, a revived
  old-age death would just die again, identically, on the very next
  `ageUp`, making the whole revive a naira sink for nothing; this was a
  real bug. `treatInjury`/`TREATMENT_COST`/`CRITICAL_HEALTH_THRESHOLD` heals a
  maimed-but-alive character whose health has dropped critically low
  (shown as a banner in the main play screen). Most event choices don't
  carry `risk` at all — reserve it for choices already describing genuine
  danger, not routine costs.
- Pray / "speak with your God" (`pray()` in `lifeSim.ts`, the always-visible
  button in `LifeSim.tsx` just under the job line) is capped per year
  (`MAX_PRAYERS_PER_YEAR`, same shape as `hustle()`) and resolves on a flat
  50/50 coin flip — "super randomly" per the design ask, with **no**
  weighting by faith, stats, or anything else. Flavor text differs per
  `LifeCharacter.faith` (`content/prayers.ts`'s `PRAYER_FLAVORS`), but the
  odds and the three possible blessing effects (happiness, health, or a
  small naira gain) are identical across every faith, atheist included —
  the design explicitly asks players to pick a faith (or none), not for
  one faith to mechanically outperform another.
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
- Shop (`src/content/shop.ts`) is generated, not hand-written, but every
  one of the 600 `SHOP_ITEMS` is a genuinely distinct product — not the
  same item re-labeled "(Dirt Cheap)"/"(Standard)"/etc. 15 `PRODUCT_LINES`
  per category (120 total, 8 categories) x 5 real brand/quality names per
  category in `BRAND_TIERS` (e.g. clothing's cheapest-to-priciest brands
  are Yaba Market → Local Tailor → Zara → Gucci → Custom Couture;
  electronics' are No-Name → Itel → Samsung → Apple → Vertu) = exactly
  600. A brand's `priceMult`/`statMult` scales that product line's base
  price/stat delta, so the price still spans dirt-cheap to "super duper
  luxurious" — the brand name just carries the tier instead of a literal
  label, so e.g. "No-Name Smartphone" and "Apple Smartphone" read as two
  different products, not two versions of one. Add a new product to
  `PRODUCT_LINES` (not 600 one-off items) to extend the catalog, or a new
  brand tier to `BRAND_TIERS` for a whole category — both multiply out
  automatically. There's a test
  (`SHOP_ITEMS.map(i => i.name)` has no duplicates) guarding this —
  don't reintroduce generic tier labels in item names. `LifeSim.tsx`'s
  Shop tab filters by category (`SHOP_CATEGORIES`) and a name search,
  capped at `SHOP_DISPLAY_LIMIT` (40) visible items at once, since
  rendering all 600 flat would be unscannable.
- Skills (`src/content/skills.ts`) is Lagos Life's other way to spend
  naira besides the shop. `buyItem`/`trainSkill` in
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
- Ages 0 through `AGE_SCHOOL_CHOICE_CUTOFF` (10) get a one-time school
  choice as *one extra step*, not a replacement for a decade of
  gameplay — `src/content/schools.ts`'s `SCHOOLS`, gated by
  `schoolsAvailableTo(wealthTier)` (a school's `minTier` must be at or
  below the character's own tier, same "richer unlocks more" direction as
  every other wealth gate). `chooseSchool` sets `LifeCharacter.schoolId`
  once and it's never cleared; `ageUp` applies that school's
  `costPerYear`/`smartsPerYear`/`happinessPerYear` every year through the
  cutoff, then stops (the field stays set, just inert past that age).
  `LifeSim.tsx` shows the school picker whenever `age <= cutoff &&
  !schoolId` — it only blocks the one year it's chosen in (every year
  after, `schoolId` is already set). Every year still gets
  `CHORES_PER_YEAR` (4) chores and up to `EVENTS_PER_YEAR` (5) life
  events regardless of age, resolved one at a time via `pendingChores`/
  `pendingEvents` queues before Age Up is offered — `pickChores`/
  `pickEvent` already return nothing for the infant band (ages 0-2) on
  their own, so ages 3-10 get the same real child-band content as any
  other year. **This used to be gated on `age > AGE_SCHOOL_CHOICE_CUTOFF`
  outright, which silently zeroed out ages 3-10's gameplay entirely (just
  the school pick, then ten years of clicking "Age up") — a real bug,
  don't reintroduce that gate.** `handleAgeUp`'s event-picking loop also
  dedupes within the batch (`pickedIds`) — `pickEvent` only avoids
  repeats against `seenEventIds`, which doesn't update until an event is
  actually resolved, so without the dedupe the same event could be drawn
  twice in one year.
- Age Up is deliberately semi-tedious: `src/content/chores.ts`'s `CHORES`
  is a pool of small daily tasks (distinct from `LIFE_EVENTS`, which have
  real branching choices and bigger stakes); `pickChores(character,
  CHORES_PER_YEAR)` rolls a fresh set every time a year starts (character
  creation and every `ageUp`), and `LifeSim.tsx` won't show the Age Up
  button again until `pendingChores` is empty. A band with no chores in
  the pool (infancy) just gets an empty list, so Age Up stays immediate
  there; add new chores to the pool rather than raising
  `CHORES_PER_YEAR` if an age band needs more variety, so the friction
  doesn't come from repeating the same 2-3 chores over and over.
- Each chore belongs to one of three `ChoreCategory`s (`labor` / `errands`
  / `finance`), each with **two** mini-game variants
  (`VARIANTS_BY_CATEGORY` in `content/chores.ts`; `src/ui/
  ChoreChallenge.tsx` renders all six): `labor` gets a timing game (stop a
  sweeping marker in a zone) or a tap-rhythm game (stop a count on a
  target number); `errands` gets a memorize-then-repeat icon sequence or
  a spot-the-odd-one-out grid; `finance` gets a change-counting question
  or a cheapest-of-three pick, both against a countdown. Which variant a
  given chore instance gets is `pickChoreGameVariant` in `lifeSim.ts`: if
  that specific chore (by id) was last played within
  `GAME_REPEAT_COOLDOWN_YEARS` (3), the *other* variant is preferred —
  "don't repeat games in 3 years" — tracked per chore id in
  `LifeCharacter.choreGameHistory`, written by `recordChoreGamePlayed` on
  every attempt (pass or fail), not just a successful one.
  **Passing is mandatory to age up** — a failed round no longer clears
  the chore; `LifeSim.tsx`'s `pendingChores` only drops an entry once
  `resolveChore` is called with `passed: true`, and `handleAgeUp` already
  refuses while `pendingChores.length > 0`. A fresh retry re-rolls the
  variant (almost certainly the other one, per the cooldown) rather than
  replaying the one that just failed. Passing grants the chore's full
  delta plus 4-10 points of that category's skill (`LifeCharacter.
  choreSkills`, 0-100, logged as a level-up line every 10-point boundary
  crossed). Each challenge gets harder as its category's level rises
  (narrower timing zone, longer sequence, shorter countdown) — leveling
  up is never meant to trivialize the "hard challenge to pass" the design
  calls for.
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

- `src/ui/Settings.tsx` is one of the tabs in `LifeSim.tsx` (alongside
  Shop/Skills/Marriage), not a separate screen — rebuilt from scratch for
  this game mode (the pre-removal `Settings.tsx` was entirely coupled to
  the removed story mode's Zustand store). It holds theme (light/dark/
  match-device, persisted to `localStorage` under
  `storytime-lagos:theme` and applied via `document.documentElement`'s
  `data-theme` attribute — `index.css`'s `:root[data-theme="light"]`/
  `[data-theme="dark"]` blocks already existed for this, just had no UI
  to set them before), faith (`changeFaith` in `lifeSim.ts` — flavor-only,
  changes which `PRAYER_FLAVORS` text `pray()` picks, not the mechanic),
  the `AccountSection` sign-in widget, blocked-player unblocking, and a
  confirm-gated "Start a new life" reset.

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
  no Firestore call in it. `firestore.rules`' `marriageProposals` update
  rule only lets `toUid` change `status`, only from `pending` to
  `accepted`/`declined`, and pins every other field — the sender used to
  also be allowed to update the doc, meaning a sender could accept their
  own proposal and force a marriage the other side never agreed to; that
  was a real bug. `firestore.rules` needs its own
  `lifesimPresence/{uid}` and `marriageProposals/{id}` blocks (already in
  the repo's copy, needs publishing same as every other collection here).
- **Send money** (same `LifeSimSocial.tsx`, a "Send money" button next to
  a nearby player or the spouse): "send money to each other to help" per
  the design ask, capped at `SEND_CAP_FRACTION` (20%) of current naira per
  rolling `SEND_WINDOW_YEARS` (5) — `maxSendable` sums
  `LifeCharacter.sentTransfers` newer than 5 years old and subtracts from
  the cap; `sendMoney` refuses anything over that remainder the same
  "refuse rather than throw" way it refuses an unaffordable amount. The
  UI clamps the input to `maxSendable` rather than the raw naira balance.
  No accept/decline step — `sendMoney` in `lifeSim.ts`
  deducts the sender's own naira and persists it immediately, and
  `sendMoneyTransfer` writes a `moneyTransfers/{id}` doc. The recipient's
  client watches `watchIncomingTransfers` (their uid, unclaimed only),
  credits their own naira locally via `receiveMoney`, and calls
  `claimMoneyTransfer` to mark it claimed — same "neither side writes the
  other's save document" principle as marriage; `firestore.rules` only
  lets the recipient flip `claimed` and only lets the sender create a doc
  with a positive amount and their own uid as `fromUid`.
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
