import { describe, expect, it } from "vitest";
import {
  ageUp,
  applyDelta,
  availableJobs,
  checkDeath,
  createCharacter,
  resolveEvent,
  takeJob,
  type LifeCharacter,
} from "../src/engine/lifeSim";
import { LIFE_EVENTS, bandForAge } from "../src/content/lifeEvents";

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
    expect(next.stats.naira).toBe(13); // base 10 + delta 3
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

  it("assigns a job once old enough", () => {
    const adult = baseCharacter({ age: 20 });
    const next = takeJob(adult, "trader");
    expect(next.job).toBe("trader");
  });
});

describe("createCharacter", () => {
  it("starts alive, at age 0, with naira at 0", () => {
    const c = createCharacter("Ada");
    expect(c.alive).toBe(true);
    expect(c.age).toBe(0);
    expect(c.stats.naira).toBe(0);
    expect(c.name).toBe("Ada");
  });

  it("falls back to a default name when blank", () => {
    const c = createCharacter("   ");
    expect(c.name.length).toBeGreaterThan(0);
  });
});
