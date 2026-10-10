import { describe, expect, it } from "vitest";
import {
  ageUp,
  applyDelta,
  availableJobs,
  blockPlayer,
  buyItem,
  changeFaith,
  checkDeath,
  chooseSchool,
  createCharacter,
  hustle,
  isChoiceAvailable,
  marry,
  meetsAgeUpRequirements,
  maxSendable,
  pray,
  receiveMoney,
  resolveChore,
  resolveEvent,
  reviveCharacter,
  rollWealthTier,
  sendMoney,
  takeJob,
  treatInjury,
  trainSkill,
  unblockPlayer,
  AGE_SCHOOL_CHOICE_CUTOFF,
  AGE_UP_REQUIREMENTS,
  MAX_HUSTLES_PER_YEAR,
  MAX_PRAYERS_PER_YEAR,
  REVIVE_COST,
  TREATMENT_COST,
  type LifeCharacter,
} from "../src/engine/lifeSim";
import { SCHOOLS } from "../src/content/schools";
import { WEALTH_TIERS } from "../src/content/characterCreation";
import { LIFE_EVENTS, bandForAge } from "../src/content/lifeEvents";
import { CHORES, pickChores } from "../src/content/chores";
import { SHOP_ITEMS } from "../src/content/shop";
import { SKILLS, SKILL_TRAIN_COST } from "../src/content/skills";

function baseCharacter(overrides: Partial<LifeCharacter> = {}): LifeCharacter {
  return {
    name: "Test",
    age: 20,
    job: "none",
    stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 10 },
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
    ...overrides,
  };
}

describe("lifeEvents data", () => {
  // Infants (age 0-2) are too young to make choices, so "infant" has no
  // event pool by design — pickEvent() returns null and ageUp() just
  // applies natural stat drift for those years.
  it("covers every choice-making age band (child, teen, adult) with events", () => {
    const bands: ReturnType<typeof bandForAge>[] = ["child", "teen", "adult"];
    for (const band of bands) {
      const pool = LIFE_EVENTS.filter((e) => e.bands.includes(band));
      expect(pool.length).toBeGreaterThan(0);
    }
  });

  it("every event has at least 2 choices, each with a label and result", () => {
    for (const event of LIFE_EVENTS) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of event.choices) {
        expect(choice.label.length).toBeGreaterThan(0);
        expect(choice.result.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("applyDelta", () => {
  it("clamps stats between 0 and 100", () => {
    const stats = applyDelta(
      { happiness: 95, health: 5, smarts: 50, looks: 50, naira: 2 },
      { happiness: 20, health: -20, naira: -10 },
    );
    expect(stats.happiness).toBe(100);
    expect(stats.health).toBe(0);
    expect(stats.naira).toBe(0); // naira floors at 0, not negative
  });
});

describe("checkDeath", () => {
  it("reports death when health hits 0", () => {
    const c = baseCharacter({ stats: { happiness: 50, health: 0, smarts: 50, looks: 50, naira: 0 } });
    expect(checkDeath(c)).not.toBeNull();
  });

  it("reports death at or past the character's lifespan", () => {
    const c = baseCharacter({ age: 80, lifespan: 80 });
    expect(checkDeath(c)).not.toBeNull();
  });

  it("returns null while alive and under lifespan", () => {
    const c = baseCharacter({ age: 20, lifespan: 80 });
    expect(checkDeath(c)).toBeNull();
  });
});

describe("resolveEvent", () => {
  it("applies the chosen delta and logs the result", () => {
    const event = LIFE_EVENTS.find((e) => e.id === "found-money")!;
    const c = baseCharacter();
    const next = resolveEvent(c, event, 0);
    expect(next.stats.naira).toBe(510); // base 10 + delta 500
    expect(next.log.at(-1)).toContain(event.choices[0].result);
    expect(next.seenEventIds).toContain(event.id);
  });

  it("kills the character if the choice drops health to 0", () => {
    const event = LIFE_EVENTS[0];
    const lethal = { ...event, choices: [{ label: "x", result: "fatal", delta: { health: -999 } }] };
    const c = baseCharacter({ stats: { happiness: 50, health: 10, smarts: 50, looks: 50, naira: 0 } });
    const next = resolveEvent(c, lethal, 0);
    expect(next.alive).toBe(false);
    expect(next.deathCause).not.toBeNull();
  });

  it("leaves the resilience streak untouched — it's a once-a-year check in ageUp, not per event", () => {
    const event = LIFE_EVENTS.find((e) => e.id === "found-money")!; // no health delta
    const c = baseCharacter({ streak: 3, stats: { happiness: 50, health: 40, smarts: 50, looks: 50, naira: 0 } });
    const next = resolveEvent(c, event, 0);
    expect(next.streak).toBe(3);
  });
});

describe("risky choices (EventRisk)", () => {
  it("a risk chance of 0 never maims or kills beyond the choice's own delta", () => {
    const event = {
      ...LIFE_EVENTS[0],
      choices: [
        {
          label: "x",
          result: "safe",
          delta: { happiness: 1 },
          risk: { chance: 0, fatalShare: 1, maimDelta: { health: -99 }, maimResult: "maimed", deathResult: "dead" },
        },
      ],
    };
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    const next = resolveEvent(c, event, 0);
    expect(next.alive).toBe(true);
    expect(next.stats.health).toBe(50);
  });

  it("a risk chance of 1 with fatalShare 1 always kills, overriding the choice's own result line", () => {
    const event = {
      ...LIFE_EVENTS[0],
      choices: [
        {
          label: "x",
          result: "safe-sounding text",
          delta: { happiness: 1 },
          risk: { chance: 1, fatalShare: 1, maimDelta: { health: -99 }, maimResult: "maimed", deathResult: "fatal risk text" },
        },
      ],
    };
    const c = baseCharacter();
    const next = resolveEvent(c, event, 0);
    expect(next.alive).toBe(false);
    expect(next.deathCause).toBe("fatal risk text");
  });

  it("a risk chance of 1 with fatalShare 0 always maims (applies the extra delta, stays alive)", () => {
    const event = {
      ...LIFE_EVENTS[0],
      choices: [
        {
          label: "x",
          result: "ok",
          delta: { happiness: 1 },
          risk: { chance: 1, fatalShare: 0, maimDelta: { health: -30 }, maimResult: "ouch", deathResult: "dead" },
        },
      ],
    };
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    const next = resolveEvent(c, event, 0);
    expect(next.alive).toBe(true);
    expect(next.stats.health).toBe(20);
    expect(next.log.at(-1)).toContain("ouch");
  });
});

describe("reviveCharacter", () => {
  it("revives a dead character who can afford it, deducting the cost and restoring some health", () => {
    const dead = baseCharacter({
      alive: false,
      deathCause: "something",
      stats: { happiness: 50, health: 0, smarts: 50, looks: 50, naira: REVIVE_COST + 10_000 },
    });
    const next = reviveCharacter(dead);
    expect(next.alive).toBe(true);
    expect(next.deathCause).toBeNull();
    expect(next.stats.naira).toBe(10_000);
    expect(next.stats.health).toBeGreaterThan(0);
  });

  it("refuses to revive if the character can't afford it", () => {
    const dead = baseCharacter({ alive: false, deathCause: "x", stats: { happiness: 50, health: 0, smarts: 50, looks: 50, naira: 100 } });
    expect(reviveCharacter(dead)).toBe(dead);
  });

  it("refuses to revive an already-alive character", () => {
    const alive = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 10_000_000 } });
    expect(reviveCharacter(alive)).toBe(alive);
  });
});

describe("treatInjury", () => {
  it("heals a critically injured character who can afford it", () => {
    const hurt = baseCharacter({
      stats: { happiness: 50, health: 5, smarts: 50, looks: 50, naira: TREATMENT_COST + 5000 },
    });
    const next = treatInjury(hurt);
    expect(next.stats.health).toBeGreaterThan(5);
    expect(next.stats.naira).toBe(5000);
  });

  it("refuses when health isn't critical", () => {
    const healthy = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 1_000_000 } });
    expect(treatInjury(healthy)).toBe(healthy);
  });

  it("refuses when the character can't afford treatment", () => {
    const poor = baseCharacter({ stats: { happiness: 50, health: 5, smarts: 50, looks: 50, naira: 100 } });
    expect(treatInjury(poor)).toBe(poor);
  });
});

describe("choice gating (requiresAsset / requiresNaira / grantsAsset)", () => {
  it("hides a requiresAsset choice until the character owns that asset, and resolveEvent refuses it too", () => {
    const event = LIFE_EVENTS.find((e) => e.id === "generator-bill")!;
    const runChoice = event.choices.find((c) => c.requiresAsset === "generator")!;
    const withoutGenerator = baseCharacter({ stats: { ...baseCharacter().stats, naira: 1_000_000 } });
    expect(isChoiceAvailable(withoutGenerator, runChoice)).toBe(false);
    // Even if a caller bypasses the UI's filtering, the engine itself must
    // not apply an unavailable choice's effects.
    const unchanged = resolveEvent(withoutGenerator, event, event.choices.indexOf(runChoice));
    expect(unchanged).toBe(withoutGenerator);

    const withGenerator = baseCharacter({ assets: ["generator"] });
    expect(isChoiceAvailable(withGenerator, runChoice)).toBe(true);
  });

  it("hides a requiresNaira choice until the character can afford it", () => {
    const event = LIFE_EVENTS.find((e) => e.id === "generator-opportunity")!;
    const buyChoice = event.choices.find((c) => c.requiresNaira != null)!;
    const poor = baseCharacter({ stats: { ...baseCharacter().stats, naira: 1000 } });
    expect(isChoiceAvailable(poor, buyChoice)).toBe(false);
    const rich = baseCharacter({ stats: { ...baseCharacter().stats, naira: 500_000 } });
    expect(isChoiceAvailable(rich, buyChoice)).toBe(true);
  });

  it("grants the asset once a grantsAsset choice is resolved", () => {
    const event = LIFE_EVENTS.find((e) => e.id === "generator-opportunity")!;
    const buyIndex = event.choices.findIndex((c) => c.grantsAsset === "generator");
    const rich = baseCharacter({ stats: { ...baseCharacter().stats, naira: 500_000 } });
    const next = resolveEvent(rich, event, buyIndex);
    expect(next.assets).toContain("generator");
    expect(next.stats.naira).toBe(rich.stats.naira - 180_000);
  });

  it("the borehole chain works the same way: buy it, then the cheap water-scarcity choice unlocks", () => {
    const buyEvent = LIFE_EVENTS.find((e) => e.id === "borehole-opportunity")!;
    const buyIndex = buyEvent.choices.findIndex((c) => c.grantsAsset === "borehole");
    const rich = baseCharacter({ stats: { ...baseCharacter().stats, naira: 500_000 } });
    const owner = resolveEvent(rich, buyEvent, buyIndex);
    expect(owner.assets).toContain("borehole");

    const scarcityEvent = LIFE_EVENTS.find((e) => e.id === "water-scarcity")!;
    const cheapChoice = scarcityEvent.choices.find((c) => c.requiresAsset === "borehole")!;
    expect(isChoiceAvailable(owner, cheapChoice)).toBe(true);
    expect(isChoiceAvailable(rich, cheapChoice)).toBe(false); // rich but no borehole yet
  });

  it("hides apartment-hunting-fees' move-in choice until the character can afford the full year + agency + legal fees", () => {
    const event = LIFE_EVENTS.find((e) => e.id === "apartment-hunting-fees")!;
    const moveIn = event.choices.find((c) => c.requiresNaira != null)!;
    const poor = baseCharacter({ stats: { ...baseCharacter().stats, naira: 100_000 } });
    expect(isChoiceAvailable(poor, moveIn)).toBe(false);
    const rich = baseCharacter({ stats: { ...baseCharacter().stats, naira: 900_000 } });
    expect(isChoiceAvailable(rich, moveIn)).toBe(true);
  });

  it("every new event still keeps at least one choice available with no money and no assets", () => {
    const broke = baseCharacter({ stats: { ...baseCharacter().stats, naira: 0 } });
    for (const id of ["flood-damage", "danfo-breakdown", "apartment-hunting-fees", "okada-ban", "pickpocket", "mosque-giving", "salary-delay", "malaria", "village-remittance"]) {
      const event = LIFE_EVENTS.find((e) => e.id === id)!;
      expect(event.choices.some((c) => isChoiceAvailable(broke, c))).toBe(true);
    }
  });
});

describe("ageUp resilience streak", () => {
  it("extends the streak when health stays at or above the threshold after natural drift", () => {
    // Health 80 with ageUp's drift range (-2 to +1, before the 60+ age
    // penalty) can land as low as 78 — safely above the 30 threshold no
    // matter which random outcome lands, so this is deterministic.
    const c = baseCharacter({ age: 20, streak: 3, stats: { happiness: 50, health: 80, smarts: 50, looks: 50, naira: 0 } });
    const next = ageUp(c);
    expect(next.streak).toBe(4);
  });

  it("resets the streak when health drops below the threshold after natural drift", () => {
    // Health 1 can rise by at most 1 from drift, landing at 2 — always
    // below the 30 threshold regardless of the random outcome.
    const c = baseCharacter({ age: 20, streak: 5, stats: { happiness: 50, health: 1, smarts: 50, looks: 50, naira: 0 } });
    const next = ageUp(c);
    expect(next.streak).toBe(0);
  });
});

describe("chores", () => {
  it("covers every choice-making age band with at least one chore", () => {
    const bands: ReturnType<typeof bandForAge>[] = ["child", "teen", "adult"];
    for (const band of bands) {
      expect(CHORES.filter((c) => c.bands.includes(band)).length).toBeGreaterThan(0);
    }
  });

  it("returns an empty list for a band with no chores (infant) rather than throwing", () => {
    expect(pickChores(baseCharacter({ age: 1 }), 3)).toEqual([]);
  });

  it("never returns more chores than requested or than exist for the band", () => {
    const picked = pickChores(baseCharacter({ age: 25 }), 3);
    expect(picked.length).toBeLessThanOrEqual(3);
    expect(picked.every((c) => c.bands.includes("adult"))).toBe(true);
    // no duplicates
    expect(new Set(picked.map((c) => c.id)).size).toBe(picked.length);
  });

  it("filters out infrastructure-poverty-coded chores once the character is well off", () => {
    const rich = baseCharacter({ age: 25, stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 3_200_000 } });
    // Run many draws — pickChores shuffles, so a single draw proves nothing.
    for (let i = 0; i < 30; i++) {
      const picked = pickChores(rich, 20); // ask for way more than exist to see the whole pool
      expect(picked.some((c) => c.id === "charge-phone")).toBe(false);
      expect(picked.some((c) => c.id === "fuel-queue")).toBe(false);
    }
  });

  it("excludes a chore once the character owns the asset that makes it moot", () => {
    const poor = baseCharacter({ age: 25, assets: ["generator"] });
    for (let i = 0; i < 30; i++) {
      const picked = pickChores(poor, 20);
      expect(picked.some((c) => c.id === "charge-phone")).toBe(false);
    }
  });

  it("only offers a requiresAsset chore once the character owns that asset", () => {
    const withoutGenerator = baseCharacter({ age: 25 });
    const withGenerator = baseCharacter({ age: 25, assets: ["generator"] });
    let everSeenWithout = false;
    let everSeenWith = false;
    for (let i = 0; i < 30; i++) {
      if (pickChores(withoutGenerator, 20).some((c) => c.id === "generator-maintenance")) everSeenWithout = true;
      if (pickChores(withGenerator, 20).some((c) => c.id === "generator-maintenance")) everSeenWith = true;
    }
    expect(everSeenWithout).toBe(false);
    expect(everSeenWith).toBe(true);
  });

  it("only offers a minNaira chore once the character can afford the implied lifestyle", () => {
    const poor = baseCharacter({ age: 25 });
    const rich = baseCharacter({ age: 25, stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 5_000_000 } });
    let everSeenForPoor = false;
    let everSeenForRich = false;
    for (let i = 0; i < 30; i++) {
      if (pickChores(poor, 20).some((c) => c.id === "manage-staff")) everSeenForPoor = true;
      if (pickChores(rich, 20).some((c) => c.id === "manage-staff")) everSeenForRich = true;
    }
    expect(everSeenForPoor).toBe(false);
    expect(everSeenForRich).toBe(true);
  });

  it("resolveChore applies the delta and logs the chore's text", () => {
    const chore = CHORES.find((c) => c.id === "market-run")!;
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 5000 } });
    const next = resolveChore(c, chore);
    expect(next.stats.naira).toBe(3000); // 5000 - 2000
    expect(next.log.some((line) => line.includes(chore.text))).toBe(true);
  });

  it("resolveChore(passed=true) gains chore-category skill; (passed=false) doesn't", () => {
    const chore = CHORES.find((c) => c.id === "market-run")!;
    const c = baseCharacter();
    const passedNext = resolveChore(c, chore, true);
    expect(passedNext.choreSkills.finance).toBeGreaterThan(c.choreSkills.finance);

    const failedNext = resolveChore(c, chore, false);
    expect(failedNext.choreSkills.finance).toBe(c.choreSkills.finance);
  });

  it("resolveChore still clears/applies the chore on a failed challenge, just worse", () => {
    const chore = CHORES.find((c) => c.id === "sweep-frontage")!; // delta: { happiness: 1 }
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    const failedNext = resolveChore(c, chore, false);
    expect(failedNext.stats.happiness).toBeLessThan(c.stats.happiness);
  });

  it("logs a level-up line once a chore-category skill crosses a 10-point boundary", () => {
    const chore = CHORES.find((c) => c.id === "market-run")!;
    let c = baseCharacter();
    let sawLevelUp = false;
    for (let i = 0; i < 20 && !sawLevelUp; i++) {
      c = resolveChore(c, chore, true);
      if (c.log.some((line) => line.includes("Getting better at finance"))) sawLevelUp = true;
    }
    expect(sawLevelUp).toBe(true);
  });
});

describe("jobs", () => {
  it("only offers jobs the character is old enough for", () => {
    const child = baseCharacter({ age: 10 });
    expect(availableJobs(child)).toHaveLength(0);
    const adult = baseCharacter({ age: 25 });
    expect(availableJobs(adult).length).toBeGreaterThan(0);
  });

  it("refuses to assign a job below the minimum age", () => {
    const child = baseCharacter({ age: 10 });
    const next = takeJob(child, "trader");
    expect(next.job).toBe("none");
  });

  it("assigns a job once old enough and skilled enough", () => {
    const adult = baseCharacter({ age: 20, skills: { trading: 20 } });
    const next = takeJob(adult, "trader");
    expect(next.job).toBe("trader");
  });

  it("refuses a job the character doesn't have the required skill level for, even bypassing availableJobs", () => {
    const unskilled = baseCharacter({ age: 20 });
    const next = takeJob(unskilled, "trader"); // requires trading: 20, has 0
    expect(next.job).toBe("none");
    expect(next).toBe(unskilled);
  });

  it("hawker (no skill requirement) is always available to an adult", () => {
    const adult = baseCharacter({ age: 20 });
    expect(availableJobs(adult).some((j) => j.id === "hawker")).toBe(true);
  });
});

const creationOpts = (overrides: Partial<Parameters<typeof createCharacter>[0]> = {}) => ({
  name: "Ada",
  birthDate: "2000-01-01",
  faith: "christian" as const,
  wealthTier: "middle-class" as const,
  inheritance: 500_000,
  ...overrides,
});

describe("createCharacter", () => {
  it("starts alive, at age 0, with naira set to the inheritance", () => {
    const c = createCharacter(creationOpts());
    expect(c.alive).toBe(true);
    expect(c.age).toBe(0);
    expect(c.stats.naira).toBe(500_000);
    expect(c.name).toBe("Ada");
  });

  it("falls back to a default name when blank", () => {
    const c = createCharacter(creationOpts({ name: "   " }));
    expect(c.name.length).toBeGreaterThan(0);
  });

  it("starts with every skill present at a low random level, inventory and assets empty", () => {
    const c = createCharacter(creationOpts());
    for (const skill of SKILLS) {
      expect(c.skills[skill.id]).toBeGreaterThanOrEqual(0);
      expect(c.skills[skill.id]).toBeLessThanOrEqual(10);
    }
    expect(c.inventory).toEqual([]);
    expect(c.assets).toEqual([]);
    expect(c.earnedThisYear).toBe(0);
    expect(c.spentThisYear).toBe(0);
  });

  it("carries the chosen faith, birth date and wealth tier through", () => {
    const c = createCharacter(creationOpts({ faith: "muslim", wealthTier: "rich", inheritance: 3_000_000 }));
    expect(c.faith).toBe("muslim");
    expect(c.wealthTier).toBe("rich");
    expect(c.stats.naira).toBe(3_000_000);
    expect(c.birthDate).toBe("2000-01-01");
  });
});

describe("rollWealthTier", () => {
  it("always returns a known tier with an inheritance inside that tier's range", () => {
    for (let i = 0; i < 100; i++) {
      const scores = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
      const { tier, inheritance } = rollWealthTier(scores);
      const def = WEALTH_TIERS.find((t) => t.id === tier);
      expect(def).toBeDefined();
      expect(inheritance).toBeGreaterThanOrEqual(def!.inheritanceMin);
      expect(inheritance).toBeLessThanOrEqual(def!.inheritanceMax);
    }
  });

  it("low answer scores never roll the top tier", () => {
    for (let i = 0; i < 50; i++) {
      const { tier } = rollWealthTier([0, 0, 0]);
      expect(tier).not.toBe("famous");
      expect(tier).not.toBe("stupendously-rich");
    }
  });

  it("maximum answer scores can reach the top tier", () => {
    let sawFamous = false;
    for (let i = 0; i < 200; i++) {
      const { tier } = rollWealthTier([6, 6, 6]);
      if (tier === "famous") sawFamous = true;
    }
    expect(sawFamous).toBe(true);
  });
});

describe("shop", () => {
  it("buys an item, deducts the price, applies its stat boost, and tracks the spend", () => {
    const item = SHOP_ITEMS.find((i) => i.id === "suya-night")!; // price 2000, happiness +3
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 5000 } });
    const next = buyItem(c, item);
    expect(next.stats.naira).toBe(3000);
    expect(next.stats.happiness).toBe(53);
    expect(next.inventory).toContain(item.id);
    expect(next.spentThisYear).toBe(2000);
  });

  it("refuses to buy an item the character can't afford", () => {
    const item = SHOP_ITEMS.find((i) => i.id === "laptop")!; // price 250,000
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 1000 } });
    const next = buyItem(c, item);
    expect(next).toBe(c);
  });

  it("refuses to buy the same item twice", () => {
    const item = SHOP_ITEMS.find((i) => i.id === "second-hand-fan")!;
    const c = baseCharacter({ inventory: [item.id], stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 1_000_000 } });
    const next = buyItem(c, item);
    expect(next).toBe(c);
  });

  it("includes a cheap enough item that any adult earning the minimum can always hit the spend requirement", () => {
    const cheapest = Math.min(...SHOP_ITEMS.map((i) => i.price));
    expect(cheapest).toBeLessThanOrEqual(500);
  });
});

describe("skills", () => {
  it("trainSkill raises the chosen skill, costs naira and a little health, and tracks the spend", () => {
    const skill = SKILLS.find((s) => s.id === "tech")!;
    const c = baseCharacter({ skills: { tech: 10 }, stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 10000 } });
    const next = trainSkill(c, skill, SKILL_TRAIN_COST);
    expect(next.skills.tech).toBeGreaterThan(10);
    expect(next.skills.tech).toBeLessThanOrEqual(25);
    expect(next.stats.naira).toBe(10000 - SKILL_TRAIN_COST);
    expect(next.stats.health).toBe(49);
    expect(next.spentThisYear).toBe(SKILL_TRAIN_COST);
  });

  it("refuses to train without enough naira", () => {
    const skill = SKILLS.find((s) => s.id === "tech")!;
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 100 } });
    const next = trainSkill(c, skill, SKILL_TRAIN_COST);
    expect(next).toBe(c);
  });

  it("gates a job behind its required skill level, and taking the job once skilled works", () => {
    const techJob = { skill: "tech", level: 40 };
    const unskilled = baseCharacter({ age: 20, skills: { tech: 10 } });
    expect(availableJobs(unskilled).some((j) => j.id === "tech")).toBe(false);
    const skilled = baseCharacter({ age: 20, skills: { [techJob.skill]: techJob.level } });
    expect(availableJobs(skilled).some((j) => j.id === "tech")).toBe(true);
    expect(takeJob(skilled, "tech").job).toBe("tech");
  });
});

describe("hustle", () => {
  it("earns naira, costs a little health, and is capped per year", () => {
    let c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    for (let i = 0; i < MAX_HUSTLES_PER_YEAR; i++) {
      const before = c.stats.naira;
      c = hustle(c);
      expect(c.stats.naira).toBeGreaterThan(before);
      expect(c.hustlesThisYear).toBe(i + 1);
    }
    const capped = hustle(c); // one more than the cap
    expect(capped).toBe(c);
  });

  it("ageUp resets the per-year hustle cap", () => {
    const maxedOut = baseCharacter({ hustlesThisYear: MAX_HUSTLES_PER_YEAR });
    const next = ageUp(maxedOut);
    expect(next.hustlesThisYear).toBe(0);
  });

  it("guarantees meeting the hardest band's earn requirement using only the max hustles per year, even with every roll at its floor", () => {
    // Regression test for a real bug: hustle's original 500-1,500 range
    // could bottom out at 1,500 total over 3 uses, never reaching the
    // adult band's 3,000 minEarn — an unemployed adult with no
    // money-earning event that year had no way to ever age up. Run many
    // times since hustle is randomized; every run must clear the bar.
    const hardestReq = Math.max(...Object.values(AGE_UP_REQUIREMENTS).map((r) => r.minEarn));
    for (let trial = 0; trial < 50; trial++) {
      let c = baseCharacter({ earnedThisYear: 0 });
      for (let i = 0; i < MAX_HUSTLES_PER_YEAR; i++) c = hustle(c);
      expect(c.earnedThisYear).toBeGreaterThanOrEqual(hardestReq);
    }
  });
});

describe("pray", () => {
  it("is capped per year and a no-op past the cap", () => {
    let c = baseCharacter();
    for (let i = 0; i < MAX_PRAYERS_PER_YEAR; i++) {
      const result = pray(c);
      expect(result.flavorText.length).toBeGreaterThan(0);
      expect(result.character.prayersThisYear).toBe(i + 1);
      c = result.character;
    }
    const capped = pray(c);
    expect(capped.character).toBe(c);
    expect(capped.flavorText).toBe("");
  });

  it("ageUp resets the per-year prayer cap", () => {
    const maxedOut = baseCharacter({ prayersThisYear: MAX_PRAYERS_PER_YEAR });
    const next = ageUp(maxedOut);
    expect(next.prayersThisYear).toBe(0);
  });

  it("over many trials, produces both answered and unanswered outcomes", () => {
    let sawAnswered = false;
    let sawUnanswered = false;
    for (let i = 0; i < 100; i++) {
      const c = baseCharacter();
      const result = pray(c);
      if (result.answered) sawAnswered = true;
      else sawUnanswered = true;
    }
    expect(sawAnswered).toBe(true);
    expect(sawUnanswered).toBe(true);
  });

  it("logs the flavor text for the character's chosen faith", () => {
    const c = baseCharacter({ faith: "muslim" });
    const result = pray(c);
    expect(result.character.log.at(-1)).toContain(result.flavorText);
  });
});

describe("chooseSchool / school effects in ageUp", () => {
  it("refuses a school the character's wealth tier can't reach", () => {
    const c = baseCharacter({ wealthTier: "shepeteri" });
    const elite = SCHOOLS.find((s) => s.id === "international-school")!;
    expect(chooseSchool(c, elite)).toBe(c);
  });

  it("accepts a school within the character's wealth tier", () => {
    const c = baseCharacter({ wealthTier: "stupendously-rich" });
    const elite = SCHOOLS.find((s) => s.id === "international-school")!;
    const next = chooseSchool(c, elite);
    expect(next.schoolId).toBe(elite.id);
  });

  it("ageUp applies the chosen school's cost and smarts gain while within the age window", () => {
    const school = SCHOOLS.find((s) => s.id === "community-private")!;
    const c = baseCharacter({
      age: 4,
      schoolId: school.id,
      stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 500_000 },
    });
    const next = ageUp(c);
    expect(next.stats.naira).toBeLessThanOrEqual(500_000 - school.costPerYear);
    expect(next.stats.smarts).toBeGreaterThanOrEqual(50 + school.smartsPerYear - 1); // allow natural drift
  });

  it("stops applying school cost/benefit once past the school-choice age window", () => {
    const school = SCHOOLS.find((s) => s.id === "community-private")!;
    const c = baseCharacter({
      age: AGE_SCHOOL_CHOICE_CUTOFF,
      schoolId: school.id,
      stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 500_000 },
    });
    const next = ageUp(c); // crosses past the cutoff
    expect(next.stats.naira).toBeGreaterThan(500_000 - school.costPerYear);
  });
});

describe("changeFaith", () => {
  it("updates the character's faith", () => {
    const c = baseCharacter({ faith: "christian" });
    const next = changeFaith(c, "muslim");
    expect(next.faith).toBe("muslim");
  });

  it("is a no-op (same reference) when the faith doesn't change", () => {
    const c = baseCharacter({ faith: "atheist" });
    expect(changeFaith(c, "atheist")).toBe(c);
  });
});

describe("sendMoney / receiveMoney", () => {
  it("sendMoney deducts naira and logs it, refusing an unaffordable or non-positive amount", () => {
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 10_000 } });
    const sent = sendMoney(c, 1000); // within the 20% cap (2000)
    expect(sent.stats.naira).toBe(9000);
    expect(sent.log.at(-1)).toContain("Sent ₦1,000");

    expect(sendMoney(c, 20_000)).toBe(c);
    expect(sendMoney(c, 0)).toBe(c);
    expect(sendMoney(c, -500)).toBe(c);
  });

  it("receiveMoney credits naira and logs the sender's name", () => {
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 1000 } });
    const next = receiveMoney(c, 5000, "Tunde");
    expect(next.stats.naira).toBe(6000);
    expect(next.log.at(-1)).toContain("Tunde sent you ₦5,000");
  });

  it("maxSendable caps at 20% of net worth and refuses a send over that cap", () => {
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 100_000 } });
    expect(maxSendable(c)).toBe(20_000);
    expect(sendMoney(c, 20_001)).toBe(c);
    const sent = sendMoney(c, 20_000);
    expect(sent.stats.naira).toBe(80_000);
  });

  it("counts multiple sends within the rolling 5-year window against the same cap", () => {
    let c = baseCharacter({ age: 20, stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 100_000 } });
    c = sendMoney(c, 15_000); // naira now 85,000, but cap was based on naira before this send
    expect(c.stats.naira).toBe(85_000);
    // Only 5,000 of the original 20,000 (20% of 100,000) allowance remains.
    expect(maxSendable(c)).toBeLessThanOrEqual(5_000);
    expect(sendMoney(c, 5_001)).toBe(c);
  });

  it("a send from more than 5 years ago no longer counts against the cap", () => {
    const c = baseCharacter({
      age: 30,
      stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 100_000 },
      sentTransfers: [{ age: 24, amount: 19_000 }], // 6 years ago at age 30
    });
    expect(maxSendable(c)).toBe(20_000);
  });

  it("a send from within 5 years still counts against the cap", () => {
    const c = baseCharacter({
      age: 30,
      stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 100_000 },
      sentTransfers: [{ age: 27, amount: 19_000 }], // 3 years ago at age 30
    });
    expect(maxSendable(c)).toBe(1_000);
  });
});

describe("marriage", () => {
  it("marries the character, grants a happiness boost, and logs it", () => {
    const c = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    const next = marry(c, "spouse-uid-123", "Tunde");
    expect(next.spouseUid).toBe("spouse-uid-123");
    expect(next.spouseName).toBe("Tunde");
    expect(next.stats.happiness).toBe(60);
    expect(next.log.at(-1)).toContain("Married Tunde");
  });

  it("refuses to marry a character who's already married", () => {
    const married = baseCharacter({ spouseUid: "existing-spouse", spouseName: "Bisi" });
    const next = marry(married, "someone-else", "Chidi");
    expect(next).toBe(married);
  });
});

describe("blocking", () => {
  it("blocks and unblocks a uid, idempotently", () => {
    const c = baseCharacter();
    const blocked = blockPlayer(c, "pest-uid");
    expect(blocked.blockedUids).toEqual(["pest-uid"]);
    // blocking the same uid twice doesn't duplicate it
    expect(blockPlayer(blocked, "pest-uid").blockedUids).toEqual(["pest-uid"]);
    const unblocked = unblockPlayer(blocked, "pest-uid");
    expect(unblocked.blockedUids).toEqual([]);
  });
});

describe("earn/spend-to-age-up requirement", () => {
  it("an employed adult automatically meets the earn requirement the moment the year starts, from job income alone", () => {
    const employed = baseCharacter({ age: 20, job: "hawker" });
    const next = ageUp(employed);
    expect(meetsAgeUpRequirements(next)).toBe(false); // earned yes, but hasn't spent anything yet
    expect(next.earnedThisYear).toBeGreaterThan(0);
  });

  it("is met once both earned and spent reach the band's thresholds", () => {
    const c = baseCharacter({ age: 20, earnedThisYear: 3000, spentThisYear: 3000 });
    expect(meetsAgeUpRequirements(c)).toBe(true);
  });

  it("infants and children have no requirement at all", () => {
    const baby = baseCharacter({ age: 1, earnedThisYear: 0, spentThisYear: 0 });
    expect(meetsAgeUpRequirements(baby)).toBe(true);
    const kid = baseCharacter({ age: 8, earnedThisYear: 0, spentThisYear: 0 });
    expect(meetsAgeUpRequirements(kid)).toBe(true);
  });
});
