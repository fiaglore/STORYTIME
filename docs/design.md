# STORYTIME: Lagos — Game Design Document

*Oct 9, 2026 · @Monae — exported from the source PDF for Claude Code to read.*

## Overview

STORYTIME: Lagos is a web-based narrative choice game in seven playable
chapters, one per story in *What Is It About Lagos*, built as a companion
to the self-published book.

**Pitch.** Seven people. One city. Every choice costs you money or costs
you yourself. You live each story from inside it, make the choices its
hero faced, and discover how the city answers.

| Item | Decision |
|---|---|
| Genre | Narrative choice game (interactive fiction with light management and investigation mechanics per chapter) |
| Chapters | All 7 stories, playable in book order, linked on one Lagos map |
| Platform | Web first; installable as a PWA; wrapped for Android and iOS stores later |
| Build | GitHub repository, built with Claude Code |
| Audience | Adults (target rating 16+ to 18+); dark canon endings stay playable |
| Session length | 20–40 minutes per chapter; about 4–5 hours for all seven, more with alternate endings |
| Purpose | Companion and marketing tool for the book: drives readers to the book and rewards book owners |
| Language | English narration with Nigerian Pidgin dialogue kept as written, plus an in-game glossary |

**Design pillars.**
1. **Naira or Spirit.** Almost every choice trades survival against
   integrity, the theme every story shares.
2. **Lagos is the antagonist.** The city pushes back through events,
   people and systems, never through a single villain alone.
3. **The book is canon.** Each chapter's "As Written" ending is the
   book's ending; alternate endings show the roads the characters did not
   take.
4. **One city, connected lives.** Characters cross between chapters, and
   some choices carry forward.
5. **Story, story!** Every chapter is framed as a told story, using the
   Nigerian call-and-response storytelling ritual.

## Content and rating

The dark canon endings stay playable: Mama Ngozi's stabbing, the Isale Eko
demolition violence and Ifeoma's disownment are reached through the
player's own choices, not skipped or softened.

**How dark moments are presented.** Violence is written, not shown
graphically. Each moment uses text, sound and a still illustration, then a
hard cut. The player is never rewarded for cruelty; the game shows
consequences, it does not glamorise them.

| Chapter | Content notes |
|---|---|
| The Grind | Extortion, knife violence, serious injury |
| The Ghost of Marina | Threats to family, implied disappearance, financial crime |
| The Pastor's Daughter | Same-sex relationship, religious condemnation, family rejection |
| Danfo Diaries | Police extortion, threatened assault |
| The Community Defender | Forced eviction, crowd violence, arrests |
| Roots and Thorns | Corruption, bribery, financial ruin |
| The Fabric of Dreams | Exploitation, design theft |

**Player protections that do not remove content.**
- A short content note on each chapter card before it starts.
- An optional "pause before intense scenes" setting: a one-tap prompt
  before the scene plays, then the scene plays in full.
- A help and resources link in the menu.

**Rating.** Expect a mature rating. Complete each store's age-rating
questionnaire (Google Play uses IARC; Apple uses its own age-rating form)
when wrapping for app stores. For the web and PWA version, add an age gate
on first launch.

**Distribution consideration (flagged).** *The Pastor's Daughter* depicts
a same-sex relationship. Nigeria's Same Sex Marriage (Prohibition) Act
2014 restricts public displays of same-sex relationships, and some app
stores apply regional content rules. This already applies to the book
itself. Get local legal advice before marketing the game in Nigeria, and
decide whether store listings are regional or global.

## Core systems

Every chapter runs on two shared meters, Naira and Spirit, plus one meter
unique to that chapter, and the city pushes back through a deck of Lagos
Factor events.

### Shared meters (0–100, shown in every chapter)

| Meter | What it means | Rises when | Falls when |
|---|---|---|---|
| Naira | Survival: money, security, safety of the family | You pay, comply, compromise, take the deal | You refuse, resist, walk away |
| Spirit | Integrity: dignity, honesty, being yourself | You speak the truth, protect others, refuse to bend | You lie, pay a bribe, betray someone, stay silent |

The two pull against each other by design. A choice that raises both is
rare and should feel earned (usually by help from another character). If
either meter reaches 0, the chapter moves to a "broken" ending.

### Chapter meters

| Chapter | Third meter | Danger at |
|---|---|---|
| The Grind | Profit (today's earnings vs the levy) | Below the ₦500 levy at 2 PM |
| The Ghost of Marina | Watched (how much Akin Bamidele suspects) | 100: the threat call comes early |
| The Pastor's Daughter | Suspicion (how close the family is to the truth) | 100: discovered before you choose to tell |
| Danfo Diaries | Daily target (returns owed to the bus owner) | Under target at day's end |
| The Community Defender | Morale (how united Isale Eko is) | Below 30: residents take the compensation |
| Roots and Thorns | Capital (Innovate Africa's runway in weeks) | 0: the company folds |
| The Fabric of Dreams | Vision (how much of Kosi's style survives) | Below 30: the brand loses its voice |

### Lagos Factor deck

A shared deck of short events the city throws at you between scenes. Each
chapter draws from its own pool plus a common pool. Each card offers two
or three responses, each moving the meters. Examples: "NEPA took light"
(run the generator −Naira / work in the dark −progress), "Go-slow" (take
the long route −time / pay an okada −Naira), "'Settlement' demanded" (pay
−Naira,−Spirit / argue — risk / walk away −progress), "Family needs
money" (send it −Naira,+Spirit / promise later −Spirit), "Neighbour asks
for help" (help +Spirit,−time / decline — no change), "Rain floods the
road" (wade through — risk to goods / wait it out −time).

### The Storytime frame

Each chapter opens with the narrator's call, "Story, story!", and the
player taps the response, "Story!" The narrator then says "Once upon a
time…" and the player answers "Time, time!" At the end, the narrator
closes the tale and gives the **verdict**: what the character kept
(Naira, Spirit, both or neither) and which ending was reached. Verdicts
fill the Endings gallery.

## Structure

The player moves between chapters on an illustrated Lagos map; chapters
play in book order on a first run, and each finished chapter unlocks the
next and its map location.

### The Lagos map hub

An illustrated map of Lagos with seven pins. Each pin shows the chapter
card: title, protagonist, location, content note, endings found (for
example, 2 of 4) and a Play button. Completed chapters glow; locked ones
show only a silhouette and "Story, story…".

| # | Chapter | Protagonist | Map location | Story time (relative) | Endings |
|---|---|---|---|---|---|
| 1 | The Grind | Mama Ngozi | Mushin to Oshodi | Year 0 | 4 |
| 2 | The Ghost of Marina | Tunde Adedapo | Marina, Lagos Island | Undated | 4 |
| 3 | The Pastor's Daughter | Ifeoma Mbah | Ikoyi and Yaba | Undated | 4 |
| 4 | Danfo Diaries | Dele | Agege to CMS | Year 0, months later | 4 |
| 5 | The Community Defender | Mama Peju | Isale Eko | Undated | 3 |
| 6 | Roots and Thorns | Emeka | Yaba and Apapa | Year 15 | 4 |
| 7 | The Fabric of Dreams | Kosi | Surulere | Undated | 4 |

The timeline column follows the revised manuscript: Emeka is 15 in *The
Grind* and 30 in *Roots and Thorns*. Chapters marked "Undated" have no
fixed year in the book; the game does not invent one.

### Unlocks and replay

- **First run:** chapters unlock in book order.
- **After finishing a chapter:** it can be replayed from the map at any
  time to find other endings.
- **After finishing all seven:** a free-play mode opens every chapter, and
  the "Lagos Remembers" epilogue plays (a short narrated scene that
  reflects the player's verdicts across all seven stories).

### Endings model

Every chapter has one **As Written** ending (the book's ending, marked
with a book icon) and two or three alternate endings. Endings are decided
by meter values plus key-choice flags at the chapter's final decision. The
Endings gallery shows each ending's title and verdict once found, and a
locked card with a one-line hint for those not found.

## Chapter designs

Each chapter follows its story's beats, gives the player the decisions its
hero faced, and ends in the book's ending or one of two or three
alternates. Every alternate ending is new writing proposed in the source
doc and needed the author's approval before being scripted — only Chapter
1 ("The Grind") has been scripted into this repository so far; the other
six chapters below are design notes only, not yet implemented.

### 1. The Grind — Mama Ngozi *(implemented — chapters/01-the-grind.ink)*

A single working day, 3:45 AM to 2:15 PM, played as time management with
one deadly confrontation at the end.

**Loop.** A clock runs through five phases: prepare (grind beans, fry
batches; bigger batches mean more profit and more fatigue), commute (danfo
to Oshodi plus a Lagos Factor card), morning rush (serve customers and
make change), Jagaban's 10 AM visit, and the afternoon (talk to Aisha, Old
Madam and other traders before 2 PM).

**Key decisions.**
1. How many batches to fry, which sets Profit and fatigue.
2. Whether to help the traders Jagaban targets (the tailor, the okra
   seller), which builds Solidarity but costs selling time.
3. What to tell Chidinma when she calls about JAMB money.
4. At 2:15 PM: pay the ₦500, stand on dignity, rally the traders, or leave
   for Mile 12.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: The Akara on the Ground** | Refuses with dignity, little Solidarity | Kept Spirit, lost everything else; she collapses (survival is revealed in Danfo Diaries) |
| Paid in Full | Pays the ₦500 | Kept her body, lost Chidinma's JAMB money and her pride |
| Mile 12 | Leaves before 2 PM | Kept safety, lost her customers and her spot |
| The Market Stands | Rallies traders after helping at least three of them | Kept both, for today; Jagaban promises to return |

### 2. The Ghost of Marina — Tunde Adedapo *(design only)*

An investigation chapter: dig into Victor's disappearance while Akin
Bamidele watches you dig.

**Loop.** Office days alternate with evenings. In the office you handle
accounts, search for clues and answer Akin's questions; each discovery
raises Watched. Evenings are for Lara, Bayo and decoding the ledger. Lies
to Akin lower Watched but cost Spirit.

**Key decisions and puzzles.**
1. Search Victor's desk (a hidden-object scene that finds the taped USB
   stick).
2. Crack the password from clues about Victor's habits (dates fail;
   "Integrity" works).
3. Read the ledger: match approvals, shell companies and recipient
   aliases.
4. Respond to Akin's HR file and the photo of Victor's sister: comply,
   deflect or push back.
5. Final choice: send the anonymous report abroad, stay silent, confront
   Akin, or flee with Lara.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: Lagos Hears Everything** | Sends the report | Kept Spirit; alive, free and hunted |
| The Golden Cage | Stays silent | Kept Naira and a promotion; Segun walks into Victor's trap |
| Discredited | Confronts Akin directly | Lost both; a fabricated HR file ends his career |
| Far from Marina | Flees with Lara | Kept his life, left his parents within reach of the threat |

### 3. The Pastor's Daughter — Ifeoma Mbah *(design only)*

A double-life chapter: keep the perfect daughter's mask in place while
becoming who you are.

**Loop.** A weekly cycle: Sunday service (lead worship, greet Brother
Daniel), weekday family scenes (Mummy G.O. Norma Mbah's pressure, Pastor
Okechukwu Mbah's sermons), and Tuesday at The Canvas with Sade. Time at
The Canvas raises Spirit and Suspicion together; family duties lower
Suspicion and cost Spirit.

**Key decisions.**
1. How to answer each "Have you prayed about Daniel?"
2. How far to let the relationship with Sade go, and what to tell her
   about the family.
3. In Papa's study, "Any reservations?": lie (as written) or tell the
   truth early.
4. At the dressing table on thanksgiving morning: tell Mummy, go through
   with it, leave quietly, or speak to the congregation.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: Her Own Kind of Salvation** | Tells Mummy on thanksgiving morning | Kept Spirit; disowned, moves to Surulere |
| Gold Lace | Goes through with the thanksgiving | Kept her family and comfort, lost herself |
| The Quiet Door | Leaves a letter and goes before the service | Kept Spirit, with less public fallout and a door left ajar |
| From the Pulpit | Speaks to the congregation | Kept Spirit at the highest cost; the church turns on her publicly |

### 4. Danfo Diaries — Dele *(design only)*

A route-running chapter over four working days, Monday to Thursday,
ending at Iddo.

**Loop.** Each day: call passengers in the park, collect fares and make
change fast, then pick route segments (Fadeyi, Obalende, Costain, Iddo).
Each segment carries a chance of Officer Bala. In each Bala encounter you
pay, plead, argue or flee. Kunle drives; his trust rises when you are
careful and falls when you take risks.

**Key decisions.**
1. Detour around Bala (safer, costs fuel and time) or keep the direct
   route.
2. Pay, plead, argue or flee in each encounter.
3. What to tell Bola about the missing money.
4. Thursday at Iddo: pay the ₦10,000 or defy Bala.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: His Own Man** | Defies Bala with the crowd behind him | Kept Spirit, lost some Naira; Bala swears revenge |
| Empty Hands | Pays the ₦10,000 | Kept the bus, went home with nothing |
| Impounded | Defies Bala without the crowd's support | Lost the bus for days; Dele and Kunle owe the owner |
| The Long Way Round | Avoids Bala all week | Kept the peace, lost income to detours; nothing changes |

### 5. The Community Defender — Mama Peju *(design only)*

A seven-day coalition strategy chapter, from the demolition notice to the
bulldozers.

**Loop.** Each day, Mama Peju spends three actions: visit families, hold
a meeting under the Iroko tree, work with the lawyer Mr. Adebayo, run
social media with the young women, set scouts with the young men, pool
money, or negotiate. Each night brings an escalation card (power cut,
water cut, arrests, a threat against her son). Morale is the meter that
holds the wall together.

**Key decisions.**
1. How to answer the residents who want to take the compensation.
2. Whether to accept a private offer from the developer.
3. How to respond to the threats against her family.
4. Day 7: form the human wall, negotiate better terms, or step aside.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: The Iroko Still Stands** | Forms the human wall | Lost the land, kept the community; she becomes elder to the displaced |
| Better Terms | Negotiates on Day 7 | Kept more Naira for the residents, lost the community's unity |
| Silence | Steps aside | Lost both; Isale Eko scatters without a fight |

No ending stops the demolition; this matches the book. An "Injunction"
ending was raised as an open question — the book says no.

### 6. Roots and Thorns — Emeka *(design only)*

A business chapter played in weekly turns as Innovate Africa's capital
drains.

**Loop.** Each week: pay rent, salaries and generator diesel; then spend
actions chasing the permit at Mrs. Balogun's office, pushing Baba Tunde on
the port containers, hiring and keeping staff, or calling investors.
Facilitation offers appear as Lagos Factor cards. Mama Ngozi visits
between weeks with food and advice, and her scar is the quiet reminder of
what the city takes.

**Key decisions.**
1. Refuse or pay the permit facilitation.
2. Refuse or pay the port "settlement" (half the container value).
3. What to tell investors, his mother and his London friends.
4. Whether to keep Chike by finding him more money.
5. Final choice: return to London, pay and launch, use a middleman, or
   stay and restart small.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: Too Thorny** | Calls his London boss | Kept Spirit, lost the dream; flies back to London |
| Lagos Factor | Pays the bribes | Kept the company, lost the reason he came |
| The Middleman | Lets an agent "handle" the payments | Kept the company and deniability; the guilt is his alone |
| Small Roots | Restarts small with no bribes | Kept Spirit and the dream, barely; Naira near zero |

### 7. The Fabric of Dreams — Kosi *(design only)*

A design chapter: make the collection Chief Mrs. Adeleke demands by day
and the real Kosi Kosi collection by night.

**Loop.** Day design rounds: choose fabric, palette and silhouette for
each gala piece; Chief Mrs. Adeleke approves or tears pieces apart,
trading Vision for Naira. Night rounds: build the secret collection
between power cuts with apprentices after Baba Segun falls ill.
Design-theft events reward documenting your work with photos and
timestamps.

**Key decisions.**
1. How much to concede on each gala piece.
2. Whether to document every sketch (costs time, protects you later).
3. How to use Amara's plan for the secret collection.
4. At the gala: the brooch, a public exposé, stay silent, or walk out
   before the show.

| Ending | Reached by | Verdict |
|---|---|---|
| **As Written: Kosi Kosi Has Arrived** | The brooch, with documented work and Amara's viewing | Kept both; headlines Lagos Fashion Week |
| Assisted By | Stays silent | Kept the money, lost her name |
| Runway Scandal | Public exposé without documentation | Lost both; labelled difficult and frozen out |
| Walk Out | Leaves before the gala | Kept Spirit, lost the moment; starts again small |

## Crossover web

Two character links come straight from the revised manuscript; three more
were proposed to make the city feel connected, and need author approval
before being scripted.

**In the book:**
- The Grind → Danfo Diaries: Mama Ngozi and Aisha appear at Iddo.
- The Grind → Roots and Thorns: Emeka is her son, 15 years later.

**Proposed (need approval):**
- Danfo Diaries → The Community Defender: Dele.
- The Community Defender → Roots and Thorns: Mr. Adebayo.
- The Pastor's Daughter → The Fabric of Dreams: Ifeoma.

| Link | Source | What happens in the game | Flag carried |
|---|---|---|---|
| The Grind → Danfo Diaries | Book | Mama Ngozi and Aisha appear at Iddo. If she was stabbed, she carries the scar; if she moved to Mile 12, Aisha shouts alone; if the market stood, more traders join the crowd and Dele's Solidarity starts higher. | `ngozi_outcome` |
| The Grind → Roots and Thorns | Book | Emeka is her son, 15 years later. His backstory line and Mama Ngozi's visits change with The Grind's ending (for example, whether she still bears the scar or lost her Oshodi spot). | `ngozi_outcome` |
| Danfo Diaries → The Community Defender | Proposed | Dele's danfo carries displaced Isale Eko residents after the demolition. If Dele defied Bala, he refuses their fares. | `dele_outcome` |
| The Community Defender → Roots and Thorns | Proposed | Mr. Adebayo, the lawyer, is the one honest adviser Emeka meets; his advice opens the "Small Roots" ending. | `peju_outcome` |
| The Pastor's Daughter → The Fabric of Dreams | Proposed | Ifeoma, now in Surulere, is Kosi's customer, then a model for the secret collection. | `ifeoma_outcome` |

Flag values are the ending IDs from the chapter designs (for example
`ngozi_outcome = as_written`). A chapter played with no earlier save uses
its As Written values. This repository implements the `ngozi_outcome` flag
plumbing in `src/engine/store.ts` (`setFlag`/`getFlag`) but no later
chapter reads it yet, since only Chapter 1 is scripted so far.

## Art, audio and UX

The game reads like an illustrated book come alive: text first, with still
illustrations, ambient Lagos sound and a few interactive mini-scenes per
chapter.

**Visual direction.** Flat, hand-drawn illustration with bold colour,
inspired by ankara and adire patterns. Each chapter gets one signature
colour: Grind (palm-oil orange), Marina (lagoon steel blue), Pastor's
Daughter (gold lace), Danfo (danfo yellow and black), Defender (adire
indigo), Roots (Apapa rust), Fabric (vivid ankara magenta). This repo's
`src/content/chapters.json` encodes these as the `color` field per
chapter and drives the `--chapter-accent` CSS variable.

**Asset count (first release target):** one map, seven chapter covers,
4–6 scene stills per chapter (about 40 total), 15–20 character portraits
with 2–3 expressions each, UI icons. *Not yet produced — this repo ships
with placeholder PWA icons only; see Open questions, "Art".*

**Typography.** A serif for narration (matching the book) and a bold
sans-serif for UI, meters and the narrator's call. Implemented here as
Lora (serif) + Manrope (sans), both loaded from Google Fonts in
`src/index.css`.

**Audio.** Ambient loops per location; short stingers for meter changes,
Lagos Factor cards and endings; a narrator voice for "Story, story!" and
"Once upon a time…" only, recorded once and reused. Full voice acting is
out of scope for the first release. *Not yet implemented — Howler.js is
installed as a dependency per the stack table below, but no audio assets
or playback code exist yet.*

**Screen flow.**
1. Title and age gate.
2. Lagos map hub.
3. Chapter card (content note, endings found, Play).
4. Storytime opening (call and response).
5. Story screen: illustration on top, narration below, choices as
   buttons, meters in a slim top bar. *(Illustrations not yet
   implemented — text-only for now.)*
6. Mini-scenes where the chapter calls for them (frying, making change,
   ledger, design rounds).
7. Ending and verdict screen, then the Endings gallery.

**Accessibility.**
- Adjustable text size and line spacing; dyslexia-friendly font option.
  *(Text size setting exists in Settings; it is not yet wired to actually
  change font size — see Open questions.)*
- Full keyboard and screen-reader support for every choice.
- No timed choice without a "relaxed timing" setting. *(No chapter
  currently uses timed choices, so this is moot for Chapter 1; the
  setting exists in Settings for when one does.)*
- Pidgin glossary: tap any underlined Pidgin phrase to see its meaning,
  without rewriting the dialogue. *(Glossary data exists in
  `src/content/glossary.json`; the tap-to-reveal UI is not yet built.)*
- Colour is never the only way a meter or state is shown. *(Meters show
  numeric values alongside their colour fill.)*

## Technical architecture

Build a static web app with Vite, React and TypeScript; write each
chapter's branching story in Ink; host on GitHub Pages; add PWA support;
and wrap the same build for app stores later.

### Stack

| Layer | Choice | Why |
|---|---|---|
| Language and UI | TypeScript + React, built with Vite | Fast to build, well supported by Claude Code |
| Story scripting | Ink (by inkle), run in the browser with inkjs | Built for branching narrative; chapter scripts are plain text in `chapters/*.ink` |
| Game state | Zustand | Simple, testable |
| Saves | IndexedDB via idb-keyval, with export/import of a save file | Works offline; survives refreshes |
| PWA | vite-plugin-pwa (manifest + service worker) | Installable on phone and desktop, works offline |
| Audio | Howler.js | Reliable web audio on mobile (installed; not yet wired up) |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` | Free, tied to the repo |
| App stores (later) | Capacitor, or a Trusted Web Activity for Google Play | One codebase for web and stores |
| Testing | Vitest for logic; a Playwright script for playing through a chapter | Catches broken branches |

### How a chapter runs

The Ink script holds the story text, choices and the logic for meters and
endings. The React app shows the text and choices, runs the mini-scenes,
and listens to Ink variables to update the meter bar. Cross-chapter flags
(for example `ngozi_outcome`) are saved by the app when a chapter ends and
passed into the next chapter's Ink story when it starts.

### Repository layout (as built)

```
storytime-lagos/
  .github/workflows/deploy.yml   build, test and publish to GitHub Pages
  CLAUDE.md                      project rules for Claude Code
  docs/design.md                 this design document
  chapters/                      one .ink file per chapter + (future) shared.ink
  scripts/compile-ink.mjs        compiles chapters/*.ink to src/content/compiled/
  src/
    engine/                      Ink runner hook, Zustand store, IndexedDB saves
    scenes/                      mini-scenes (frying, change-making, ...)
    ui/                          map hub, story screen, endings gallery, settings
    content/                     chapter metadata (JSON), glossary, compiled ink JSON
  public/                        PWA icons, favicon
  tests/                         Vitest engine tests + Playwright smoke script
```

### Data kept per player

| Data | Example | Stored |
|---|---|---|
| Progress | Chapters unlocked and finished | IndexedDB |
| Endings found | `grind.as_written`, `danfo.empty_hands` | IndexedDB |
| Cross-chapter flags | `ngozi_outcome = stabbed` | IndexedDB |
| Current save | Chapter, Ink state, meters | IndexedDB, exportable as a file |
| Settings | Text size, relaxed timing, audio | localStorage |

No accounts or servers are needed for the first release; everything lives
on the player's device.

## Book companion and marketing

The game's job is to send players to the book and give readers a reason to
play; every hook below supports one of those two directions.

**Game to book.**
- As Written badge: each canon ending shows a book icon and the line "This
  is how it ends in *What Is It About Lagos*" with a link to buy.
- Chapter 1: *The Grind* is always free to play on the web as the demo.
- Store links on the title screen, ending screens and the Endings gallery.
- Shareable verdict cards: after each chapter, a share image ("I kept my
  Spirit and lost my Naira in Oshodi") with the game link and book title,
  sized for WhatsApp status, Instagram and X.

**Book to game.**
- QR code in the book: one page at the end of each story with a QR code
  that opens that chapter in the game.
- Reader unlock code: a code printed in the book unlocks bonus content:
  author's notes per chapter, early sketches, and the "Lagos Remembers"
  epilogue before finishing all seven chapters.
- Back-of-book page describing the game.

*None of the above marketing hooks are implemented yet — this repo ships
the playable game only.*

### Unlock model options (decision needed)

| Option | How it works | Trade-off |
|---|---|---|
| A. Fully free, book sells itself | All 7 chapters free; book links everywhere | Widest reach, no direct game income |
| B. Chapter 1 free, code unlocks the rest | Book buyers get a code; others can buy a code | Rewards readers, smaller audience for chapters 2–7 |
| C. Free game, paid bonus pack | All chapters free; author's notes and epilogue need the book's code | Wide reach plus a reason to buy the book |

Option C is the recommended default. **Not yet decided or implemented —
all chapters currently default to locked-until-prior-chapter-finished
except Chapter 1, which is free; this is placeholder behavior until the
unlock model is chosen.**

### Launch checklist (not started)

- [ ] Landing page for the game and the book, sharing one domain
- [ ] Trailer: 30–60 seconds of the Storytime opening and map
- [ ] Short clips for TikTok and Instagram Reels from each chapter's key
      decision
- [ ] Book launch and game launch on the same week

## Build roadmap

Build one complete, polished chapter first (The Grind), then add the other
six on the same engine; each milestone ends with something playable in a
browser.

- [x] **M0 — Repo and shell.** Vite + React + TypeScript app, the
      GitHub Pages deploy workflow and the PWA manifest.
- [x] **M1 — Story engine.** Ink runner, meters bar, choice buttons, save
      and load, settings screen.
- [x] **M2 — The Grind, playable.** Full chapter script in Ink, the
      frying and change-making mini-scenes, all 4 endings, the Storytime
      opening.
- [ ] **M3 — Map hub and endings gallery polish.** Chapter cards, unlock
      rules, verdict screen and share card. *(Map hub, chapter cards and
      endings gallery exist; the unlock rule is a placeholder — see
      Option C above — and there is no share card yet.)*
- [ ] **M4 — Chapters 2–4.** The Ghost of Marina (ledger puzzle), The
      Pastor's Daughter (weekly cycle), Danfo Diaries (route runs and
      change-making), with the Mama Ngozi crossover.
- [ ] **M5 — Chapters 5–7.** The Community Defender (7-day strategy),
      Roots and Thorns (weekly business turns), The Fabric of Dreams
      (design rounds), with the Emeka crossover.
- [ ] **M6 — Art, audio and polish.** Final illustrations, ambient audio,
      the accessibility pass, content notes, age gate. *(Age gate and
      content notes exist; illustrations, audio and the rest of the
      accessibility pass do not.)*
- [ ] **M7 — Companion features and launch.** QR deep links per chapter,
      reader unlock code, landing page, analytics if wanted.
- [ ] **M8 — App stores (optional).** Wrap with Capacitor; complete store
      listings and age ratings.

## Working with Claude Code

- Keep each request to one milestone step; ask Claude Code to run the
  tests before it finishes.
- Write the chapter scripts in `chapters/*.ink` yourself or with Claude;
  keep code changes and story changes in separate commits.
- This design document lives in `docs/` so Claude Code can read it.

## Open questions

These decisions change what gets built; each needs the author's answer
before its milestone starts. (Carried over from the source PDF, with
notes on anything this repo already had to assume a default for.)

- **Alternate endings:** approve, change or cut each proposed alternate
  ending in Chapter designs (before M2 for The Grind, before M4–M5 for the
  rest). *This repo already scripted and shipped The Grind's four endings
  as proposed, since M2 is complete — flag any changes wanted.*
- **Unlock model:** A, B or C in Book companion and marketing (before M7).
  *Defaulted to "finish the prior chapter" for now, independent of A/B/C.*
- **Injunction ending:** should Isale Eko be able to win, if Morale and
  media pressure are both very high? The book says no (before M5).
- **New crossover cameos:** approve or cut the three proposed links marked
  "new" in the Crossover web (before M4).
- **Art:** commission an illustrator, or make art/tools yourself, and
  budget (before M6).
- **Narrator voice:** record your own voice for "Story, story!", or hire a
  voice actor (before M6).
- **Distribution:** global or regional store listings, and legal advice on
  Nigerian distribution of The Pastor's Daughter chapter (before M8).
- **Analytics:** track which endings players reach (privacy-friendly, no
  accounts), or none (before M7).
- **Book title in the game:** confirm the final published title of the
  book and the store links (before M7).
