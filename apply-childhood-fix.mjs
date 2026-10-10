// Run from the repo root:  node apply-childhood-fix.mjs
//
// Fix for gap #1: ages 0-10 had no gameplay. After this patch, chores and
// life events start at age 3 (the child band) instead of age 11. Ages 0-2
// stay a plain "Age up". The school choice is unchanged — it is still a
// one-time step shown first.
//
// The script is all-or-nothing: it loads every file, applies every edit in
// memory, and only writes to disk if every edit matched exactly once.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENGINE = "src/engine/lifeSim.ts";
const UI = "src/ui/LifeSim.tsx";
const EVENTS = "src/content/lifeEvents.ts";
const NEW_TEST = "tests/childhood.test.ts";

for (const p of [ENGINE, UI, EVENTS]) {
  if (!existsSync(p)) {
    console.error(`Can't find ${p} — run this from the repo root (the folder with package.json).`);
    process.exit(1);
  }
}

const files = {};
const eol = {};
function load(path) {
  const raw = readFileSync(path, "utf8");
  eol[path] = raw.includes("\r\n") ? "\r\n" : "\n";
  files[path] = raw.replace(/\r\n/g, "\n");
}
[ENGINE, UI, EVENTS].forEach(load);

if (files[ENGINE].includes("rollYearWork")) {
  console.log("Looks like this patch is already applied (rollYearWork exists). Nothing to do.");
  process.exit(0);
}

function replaceOnce(path, find, replacement) {
  const src = files[path];
  const i = src.indexOf(find);
  if (i === -1) throw new Error(`${path}: couldn't find this text:\n${find}`);
  if (src.indexOf(find, i + 1) !== -1) throw new Error(`${path}: this text appears more than once:\n${find}`);
  files[path] = src.slice(0, i) + replacement + src.slice(i + find.length);
}

function replaceBetween(path, startMarker, endMarker, replacement) {
  const src = files[path];
  const s = src.indexOf(startMarker);
  if (s === -1) throw new Error(`${path}: couldn't find start marker:\n${startMarker}`);
  const e = src.indexOf(endMarker, s);
  if (e === -1) throw new Error(`${path}: couldn't find end marker:\n${endMarker}`);
  files[path] = src.slice(0, s) + replacement + src.slice(e + endMarker.length);
}

try {
  // ---------------------------------------------------------------
  // 1. Engine: per-band counts, distinct event batches, rollYearWork
  // ---------------------------------------------------------------
  replaceOnce(
    ENGINE,
    "  GAME_REPEAT_COOLDOWN_YEARS,\n  VARIANTS_BY_CATEGORY,\n",
    "  GAME_REPEAT_COOLDOWN_YEARS,\n  VARIANTS_BY_CATEGORY,\n  pickChores,\n",
  );

  replaceOnce(
    ENGINE,
    "  return choices[randomInt(0, choices.length - 1)];\n}\n",
    `  return choices[randomInt(0, choices.length - 1)];
}

// How many chores and life events a year rolls, per age band. Infants (0-2)
// roll nothing, so those years stay a plain Age Up; gameplay starts at age 3
// (the child band). Kids get a lighter load than teens/adults: their pools
// are small, and ten years of five events a year would be mostly repeats.
export const CHORES_PER_YEAR_BY_BAND: Record<AgeBand, number> = {
  infant: 0,
  child: 2,
  teen: 4,
  adult: 4,
};

export const EVENTS_PER_YEAR_BY_BAND: Record<AgeBand, number> = {
  infant: 0,
  child: 2,
  teen: 5,
  adult: 5,
};

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Picks up to \`count\` DISTINCT events for the character's current band,
// unseen ones first. Distinct matters because seenEventIds only updates when
// an event is resolved, so calling pickEvent() in a loop at the start of the
// year could draw the same event twice before any were played.
export function pickEvents(character: LifeCharacter, count: number): LifeEvent[] {
  const band = bandForAge(character.age);
  const pool = LIFE_EVENTS.filter((e) => e.bands.includes(band));
  const unseen = pool.filter((e) => !character.seenEventIds.includes(e.id));
  const seen = pool.filter((e) => character.seenEventIds.includes(e.id));
  return [...shuffled(unseen), ...shuffled(seen)].slice(0, Math.max(0, count));
}

// Everything a new year asks of the player before Age Up unlocks. One entry
// point so character load, Age Up and tests all agree on when gameplay starts.
export function rollYearWork(character: LifeCharacter): { chores: Chore[]; events: LifeEvent[] } {
  if (!character.alive) return { chores: [], events: [] };
  const band = bandForAge(character.age);
  return {
    chores: pickChores(character, CHORES_PER_YEAR_BY_BAND[band]),
    events: pickEvents(character, EVENTS_PER_YEAR_BY_BAND[band]),
  };
}
`,
  );

  // ---------------------------------------------------------------
  // 2. UI: use rollYearWork, drop the "only past age 10" gate
  // ---------------------------------------------------------------
  replaceOnce(UI, "  pickEvent,\n  pray,\n", "  pray,\n  rollYearWork,\n");

  replaceOnce(
    UI,
    'import { pickChores, type Chore, type ChoreGameVariant } from "../content/chores";',
    'import type { Chore, ChoreGameVariant } from "../content/chores";',
  );

  replaceBetween(
    UI,
    "// How many small no-choice chores (content/chores.ts) have to be cleared",
    "const EVENTS_PER_YEAR = 5;",
    `// How many chores and events a year rolls (and from which age) is decided by
// rollYearWork in engine/lifeSim.ts — see CHORES_PER_YEAR_BY_BAND and
// EVENTS_PER_YEAR_BY_BAND there. Infants (0-2) roll none, so Age Up stays
// immediate for them; the child band (3+) is where the daily grind starts.`,
  );

  replaceOnce(
    UI,
    "return saved && saved.alive && saved.age > AGE_SCHOOL_CHOICE_CUTOFF ? pickChores(saved, CHORES_PER_YEAR) : [];",
    "return saved && saved.alive ? rollYearWork(saved).chores : [];",
  );

  replaceBetween(
    UI,
    "    // Ages through AGE_SCHOOL_CHOICE_CUTOFF get the school-choice screen",
    "      setPendingEvents(events);\n    }",
    `    // Chores and events start at age 3 (the child band); infants roll empty
    // lists so ages 0-2 stay an instant Age Up. The school choice is a
    // separate one-time step shown first — it doesn't replace this.
    if (aged.alive) {
      const work = rollYearWork(aged);
      setPendingChores(work.chores);
      setPendingEvents(work.events);
    }`,
  );

  // ---------------------------------------------------------------
  // 3. Content: more child events so ten childhood years don't repeat
  // ---------------------------------------------------------------
  const NEW_EVENTS = `  {
    id: "extra-lessons",
    bands: ["child"],
    prompt: "Your teacher says you could do better with extra lessons after school — ₦2,000 a week.",
    choices: [
      {
        label: "Ask Mama to pay for the lessons",
        result: "She sighs, counts the notes twice, and agrees. Your handwriting improves first.",
        delta: { naira: -2000, smarts: 3 },
        requiresNaira: 2000,
      },
      {
        label: "Study with the older girl next door instead",
        result: "Free, and she's strict. You learn, just slower.",
        delta: { smarts: 1, happiness: -1 },
      },
    ],
  },
  {
    id: "harmattan-dust",
    bands: ["child"],
    prompt: "Harmattan dust has turned the whole street the colour of flour, and your lips are cracking.",
    choices: [
      {
        label: "Wear the scarf and rub on the Vaseline",
        result: "Mama fusses, but your lips and your chest survive the season.",
        delta: { health: 1 },
      },
      {
        label: "Play outside like nothing is wrong",
        result: "Great games, terrible cough by Sunday.",
        delta: { happiness: 2, health: -3 },
      },
    ],
  },
  {
    id: "cultural-day",
    bands: ["child"],
    prompt: "Your school is picking dancers for cultural day.",
    choices: [
      {
        label: "Put your hand up",
        result: "You mix up one step and nobody remembers but you. The stage was yours.",
        delta: { happiness: 3, looks: 1 },
      },
      {
        label: "Hide at the back of the class",
        result: "You watch from the crowd, a little jealous.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "puff-puff-seller",
    bands: ["child"],
    prompt: "A woman sells hot puff-puff outside the school gate, and you have ₦200 in your pocket.",
    choices: [
      {
        label: "Buy some",
        result: "Hot, sugary, gone in a minute. Worth it.",
        delta: { naira: -200, happiness: 2 },
      },
      {
        label: "Save the money",
        result: "You keep it. The smell follows you all the way home.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "broken-toy",
    bands: ["child"],
    prompt: "Your younger cousin, visiting for the holidays, breaks your best toy.",
    choices: [
      {
        label: "Tell Mama",
        result: "She scolds him, then scolds you for tattling. Fair, apparently.",
        delta: { happiness: -1 },
      },
      {
        label: "Forgive him and share your other toys",
        result: "He follows you around for the rest of the holiday.",
        delta: { happiness: 2 },
      },
    ],
  },
  {
    id: "street-football",
    bands: ["child"],
    prompt: "The boys on your street are one player short for a football match.",
    choices: [
      {
        label: "Join the game",
        result: "You scrape your knee and score once. You'll tell this story for years.",
        delta: { happiness: 3, health: -1 },
      },
      {
        label: "Watch from the gate",
        result: "Safer behind the gate, and a little boring.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "village-visit",
    bands: ["child"],
    prompt: "School is on break, and Mama says the whole family is travelling to the village to see Grandma.",
    choices: [
      {
        label: "Go with the family",
        result: "A long, hot bus ride, then more food than you can finish.",
        delta: { naira: -1500, happiness: 3, health: -1 },
      },
      {
        label: "Stay with the neighbour",
        result: "Quiet days, and everyone comes back with stories you missed.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "lost-in-market",
    bands: ["child"],
    prompt: "In the crowded market you let go of Mama's wrapper — and suddenly she's gone.",
    choices: [
      {
        label: "Stay where you are and wait",
        result: "Mama finds you in five frightening minutes. You hold her hand the whole way home.",
        delta: { happiness: -1 },
      },
      {
        label: "Ask a trader at a stall to call for her",
        result: "He announces your name over his loudspeaker, and half the market cheers when she appears.",
        delta: { happiness: 1, smarts: 1 },
      },
    ],
  },`;

  const ev = files[EVENTS];
  const close = ev.lastIndexOf("\n];");
  if (close === -1) throw new Error(`${EVENTS}: couldn't find the closing "];" of LIFE_EVENTS`);
  files[EVENTS] = ev.slice(0, close) + "\n" + NEW_EVENTS + ev.slice(close);
} catch (err) {
  console.error("\nPATCH NOT APPLIED — no files were changed.\n");
  console.error(err.message);
  console.error("\nIf the file was edited since this patch was written, send the error above back to Claude.");
  process.exit(1);
}

// ---------------------------------------------------------------
// 4. New test file
// ---------------------------------------------------------------
const TEST = `import { describe, expect, it } from "vitest";
import {
  CHORES_PER_YEAR_BY_BAND,
  EVENTS_PER_YEAR_BY_BAND,
  ageUp,
  isChoiceAvailable,
  pickEvents,
  rollYearWork,
  type LifeCharacter,
} from "../src/engine/lifeSim";
import { LIFE_EVENTS } from "../src/content/lifeEvents";

function baseCharacter(overrides: Partial<LifeCharacter> = {}): LifeCharacter {
  return {
    name: "Test",
    age: 5,
    job: "none",
    stats: { happiness: 50, health: 80, smarts: 50, looks: 50, naira: 10 },
    alive: true,
    deathCause: null,
    lifespan: 80,
    log: [],
    seenEventIds: [],
    streak: 0,
    assets: [],
    inventory: [],
    skills: {},
    earnedThisYear: 0,
    spentThisYear: 0,
    hustlesThisYear: 0,
    blockedUids: [],
    birthDate: "2000-01-01",
    faith: "christian",
    wealthTier: "middle-class",
    inheritance: 0,
    prayersThisYear: 0,
    choreSkills: { labor: 0, errands: 0, finance: 0 },
    sentTransfers: [],
    schoolId: null,
    choreGameHistory: {},
    ...overrides,
  };
}

const childPool = LIFE_EVENTS.filter((e) => e.bands.includes("child"));

describe("childhood gameplay (ages 3-10)", () => {
  it("infants (0-2) roll no chores or events, so those years stay a plain Age Up", () => {
    for (const age of [0, 1, 2]) {
      const work = rollYearWork(baseCharacter({ age }));
      expect(work.chores).toEqual([]);
      expect(work.events).toEqual([]);
    }
  });

  it("gameplay starts at age 3: a child rolls the child-band number of chores and events", () => {
    for (const age of [3, 6, 10]) {
      const work = rollYearWork(baseCharacter({ age }));
      expect(work.chores).toHaveLength(CHORES_PER_YEAR_BY_BAND.child);
      expect(work.events).toHaveLength(EVENTS_PER_YEAR_BY_BAND.child);
    }
  });

  it("a school-age child (<= 10) gets the same work as any other child, not an empty year", () => {
    const work = rollYearWork(baseCharacter({ age: 7, schoolId: "local-public" }));
    expect(work.events.every((e) => e.bands.includes("child"))).toBe(true);
    expect(work.chores.length).toBeGreaterThan(0);
  });

  it("aging from 2 to 3 lands in a year that actually has work", () => {
    const aged = ageUp(baseCharacter({ age: 2 }));
    expect(aged.age).toBe(3);
    const work = rollYearWork(aged);
    expect(work.events.length).toBeGreaterThan(0);
    expect(work.chores.length).toBeGreaterThan(0);
  });

  it("a dead character rolls nothing", () => {
    const work = rollYearWork(baseCharacter({ alive: false }));
    expect(work.chores).toEqual([]);
    expect(work.events).toEqual([]);
  });

  it("child pool is big enough that a child doesn't see repeats for several years", () => {
    expect(childPool.length).toBeGreaterThanOrEqual(EVENTS_PER_YEAR_BY_BAND.child * 4);
  });

  it("every child event keeps at least one choice available with no money and no assets", () => {
    const broke = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    for (const event of childPool) {
      expect(event.choices.some((c) => isChoiceAvailable(broke, c))).toBe(true);
    }
  });
});

describe("pickEvents", () => {
  it("never returns the same event twice in one batch", () => {
    const c = baseCharacter({ age: 5 });
    for (let i = 0; i < 100; i++) {
      const ids = pickEvents(c, 5).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("prefers unseen events over seen ones", () => {
    const keep = childPool.slice(0, 2).map((e) => e.id);
    const seenEventIds = childPool.filter((e) => !keep.includes(e.id)).map((e) => e.id);
    const c = baseCharacter({ age: 5, seenEventIds });
    for (let i = 0; i < 30; i++) {
      const ids = pickEvents(c, 2).map((e) => e.id).sort();
      expect(ids).toEqual([...keep].sort());
    }
  });

  it("falls back to seen events once the unseen ones run out", () => {
    const c = baseCharacter({ age: 5, seenEventIds: childPool.map((e) => e.id) });
    expect(pickEvents(c, 2)).toHaveLength(2);
  });

  it("never returns more events than the band has, and returns [] for infants", () => {
    expect(pickEvents(baseCharacter({ age: 5 }), 999)).toHaveLength(childPool.length);
    expect(pickEvents(baseCharacter({ age: 1 }), 5)).toEqual([]);
  });
});
`;

if (existsSync(NEW_TEST)) {
  console.log(`${NEW_TEST} already exists — leaving it alone.`);
} else {
  writeFileSync(NEW_TEST, TEST);
}

for (const [path, text] of Object.entries(files)) {
  writeFileSync(path, eol[path] === "\r\n" ? text.replace(/\n/g, "\r\n") : text);
}

console.log("Patch applied:");
console.log(`  edited  ${ENGINE}`);
console.log(`  edited  ${UI}`);
console.log(`  edited  ${EVENTS}  (+8 child events)`);
console.log(`  added   ${NEW_TEST}`);
console.log("\nNext: npm test && npm run build");
