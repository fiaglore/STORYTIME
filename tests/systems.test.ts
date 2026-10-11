import { describe, expect, it } from "vitest";
import {
  AGE_UP_REQUIREMENTS,
  BUSINESS_CLOSE_RATE,
  FIRING_CHANCE,
  INFLATION_RATE,
  JOB_LEVEL_PAY_BONUS,
  LOAN_INTEREST_RATE,
  MAX_HUSTLES_PER_YEAR,
  MAX_JOB_LEVEL,
  MAX_LOAN_AMOUNT,
  MIN_BUSINESS_CAPITAL,
  PROMOTION_MIN_YEARS_IN_JOB,
  SAVINGS_INTEREST_RATE,
  SELL_RATE,
  ageUp,
  availableJobs,
  buyItem,
  closeBusiness,
  depositToSavings,
  hustle,
  jobTitleFor,
  pickEvents,
  repayLoan,
  resolveChore,
  resolveEvent,
  sellItem,
  startBusiness,
  takeJob,
  takeLoan,
  withdrawFromSavings,
  type LifeCharacter,
} from "../src/engine/lifeSim";
import { bandForAge } from "../src/content/lifeEvents";
import {
  birthdayEffects,
  hustleMultiplier,
  moodHealthDrift,
  payMultiplier,
  zodiacFor,
} from "../src/engine/modifiers";
import { CHORES, pickChores } from "../src/content/chores";
import { EVENT_RULES, isEventAllowed } from "../src/content/eventRules";
import { LIFE_EVENTS } from "../src/content/lifeEvents";
import { SHOP_ITEMS } from "../src/content/shop";

function baseCharacter(overrides: Partial<LifeCharacter> = {}): LifeCharacter {
  return {
    name: "Test",
    age: 30,
    job: "none",
    stats: { happiness: 50, health: 80, smarts: 50, looks: 50, naira: 10 },
    alive: true,
    deathCause: null,
    lifespan: 90,
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
    ateThisYear: false,
    classroomTalksThisYear: 0,
    pensionSavings: 0,
    pensionPerYear: 0,
    retired: false,
    choreGameHistory: {},
    savings: 0,
    loanBalance: 0,
    jobLevel: 0,
    yearsInJob: 0,
    unemployedStreak: 0,
    businessCapital: 0,
    ...overrides,
  };
}

const withNaira = (naira: number) => ({ happiness: 50, health: 80, smarts: 50, looks: 50, naira });
const eventIds = (c: LifeCharacter) => pickEvents(c, 999).map((e) => e.id);
const shop = (id: string) => SHOP_ITEMS.find((i) => i.id === id)!;

describe("smarts, looks and happiness now matter", () => {
  it("smarts scale job pay", () => {
    const smart = ageUp(baseCharacter({ job: "hawker", stats: { ...withNaira(0), smarts: 100 } }));
    const dim = ageUp(baseCharacter({ job: "hawker", stats: { ...withNaira(0), smarts: 0 } }));
    expect(smart.earnedThisYear).toBe(420_000);
    expect(dim.earnedThisYear).toBe(280_000);
    expect(payMultiplier(baseCharacter())).toBe(1);
  });

  it("smarts gate the better jobs", () => {
    const skills = { tech: 50 };
    const dim = baseCharacter({ skills, stats: { ...withNaira(0), smarts: 10 } });
    const bright = baseCharacter({ skills, stats: { ...withNaira(0), smarts: 40 } });
    expect(availableJobs(dim).some((j) => j.id === "tech")).toBe(false);
    expect(availableJobs(bright).some((j) => j.id === "tech")).toBe(true);
  });

  it("looks scale hustle pay, and even looks 0 still guarantees the adult earn requirement", () => {
    expect(hustleMultiplier(baseCharacter())).toBe(1);
    const hardest = Math.max(...Object.values(AGE_UP_REQUIREMENTS).map((r) => r.minEarn));
    for (let trial = 0; trial < 50; trial++) {
      let c = baseCharacter({ stats: { ...withNaira(0), looks: 0 } });
      for (let i = 0; i < MAX_HUSTLES_PER_YEAR; i++) c = hustle(c);
      expect(c.earnedThisYear).toBeGreaterThanOrEqual(hardest);
    }
  });

  it("happiness at rock bottom costs health each year; a happy life protects it", () => {
    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 0 } })).toBe(-3);
    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 10 } })).toBe(-1);
    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 50 } })).toBe(0);
    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 90 } })).toBe(1);
    const sad = ageUp(baseCharacter({ stats: { ...withNaira(0), happiness: 0 } }));
    expect(sad.stats.health).toBeLessThanOrEqual(78);
    const happy = ageUp(baseCharacter({ stats: { ...withNaira(0), happiness: 100 } }));
    expect(happy.stats.health).toBeGreaterThanOrEqual(79);
  });
});

describe("assets and owned items pay off", () => {
  it("a POS business earns income each year", () => {
    const next = ageUp(baseCharacter({ assets: ["pos-business"] }));
    expect(next.earnedThisYear).toBe(45_000);
    expect(next.stats.naira).toBe(10 + 45_000);
  });

  it("a rentable property yields a share of its price each year", () => {
    const item = shop("shop-space-2");
    const next = ageUp(baseCharacter({ inventory: [item.id] }));
    expect(next.earnedThisYear).toBe(Math.round(item.price * 0.05));
  });

  it("durable items give yearly stat perks", () => {
    const next = ageUp(baseCharacter({ inventory: ["mattress-2"] }));
    expect(next.stats.health).toBeGreaterThanOrEqual(80 - 2 + 1);
  });

  it("selling refunds part of the price, doesn't count as earnings, and blocks rebuying", () => {
    const item = shop("sedan-car-2");
    const c = baseCharacter({ inventory: [item.id], stats: withNaira(0) });
    const sold = sellItem(c, item);
    expect(sold.stats.naira).toBe(Math.floor(item.price * SELL_RATE));
    expect(sold.inventory).not.toContain(item.id);
    expect(sold.earnedThisYear).toBe(0);
    const rich = { ...sold, stats: withNaira(item.price * 2) };
    expect(buyItem(rich, item)).toBe(rich);
    expect(sellItem(sold, item)).toBe(sold);
  });
});

describe("ownership removes the struggles it solves", () => {
  it("car owners never get commute chores", () => {
    const owner = baseCharacter({ inventory: ["sedan-car-2"] });
    for (let i = 0; i < 40; i++) {
      const ids = pickChores(owner, 30).map((c) => c.id);
      expect(ids).not.toContain("commute");
      expect(ids).not.toContain("keke-squeeze");
      expect(ids).not.toContain("brt-queue");
    }
    let seen = false;
    for (let i = 0; i < 60 && !seen; i++) seen = pickChores(baseCharacter(), 30).some((c) => c.id === "commute");
    expect(seen).toBe(true);
  });

  it("car owners skip transport struggles but can be robbed in the car", () => {
    const owner = eventIds(baseCharacter({ inventory: ["sedan-car-2"] }));
    const walker = eventIds(baseCharacter());
    for (const id of ["danfo-dispute", "keke-dispute", "danfo-breakdown", "okada-ban"]) {
      expect(owner).not.toContain(id);
      expect(walker).toContain(id);
    }
    expect(owner).toContain("armed-robbery");
    expect(walker).not.toContain("armed-robbery");
  });

  it("homeowners never face rent hikes or agent fees", () => {
    const owner = eventIds(baseCharacter({ inventory: ["duplex-2"] }));
    expect(owner).not.toContain("landlord-rent");
    expect(owner).not.toContain("apartment-hunting-fees");
    expect(eventIds(baseCharacter())).toContain("landlord-rent");
  });
});

describe("wealth, faith, job and asset filters on events", () => {
  const richOnly = ["business-partnership", "tax-audit", "kidnap-scare", "charity-gala", "staff-fraud", "island-party"];

  it("a very rich character skips everyday struggles and gets rich-only events", () => {
    const ids = eventIds(baseCharacter({ stats: withNaira(50_000_000) }));
    for (const id of ["danfo-dispute", "keke-dispute", "danfo-breakdown", "okada-ban", "go-slow"]) {
      expect(ids).not.toContain(id);
    }
    for (const id of richOnly) expect(ids).toContain(id);
  });

  it("a poor character never gets rich-only events", () => {
    const ids = eventIds(baseCharacter({ stats: withNaira(1_000) }));
    for (const id of richOnly) expect(ids).not.toContain(id);
  });

  it("faith events only fire for the matching faith", () => {
    const muslim = eventIds(baseCharacter({ faith: "muslim" }));
    expect(muslim).toContain("mosque-giving");
    expect(muslim).toContain("ramadan-fast");
    expect(muslim).not.toContain("church-harvest");
    const christian = eventIds(baseCharacter({ faith: "christian" }));
    expect(christian).toContain("church-harvest");
    expect(christian).toContain("christmas-village-trip");
    expect(christian).not.toContain("mosque-giving");
    expect(eventIds(baseCharacter({ faith: "traditional" }))).toContain("new-yam-festival");
    const atheist = eventIds(baseCharacter({ faith: "atheist" }));
    expect(atheist).toContain("faith-questions");
    expect(atheist).not.toContain("church-harvest");
    expect(atheist).not.toContain("mosque-giving");
  });

  it("job-specific events need the job", () => {
    const jobless = eventIds(baseCharacter({ job: "none" }));
    for (const id of ["market-levy", "promotion-chance", "salary-delay"]) expect(jobless).not.toContain(id);
    const trader = eventIds(baseCharacter({ job: "trader" }));
    for (const id of ["market-levy", "promotion-chance", "salary-delay"]) expect(trader).toContain(id);
    expect(eventIds(baseCharacter({ job: "tech" }))).not.toContain("market-levy");
  });

  it("asset events need the asset, and owned assets aren't offered again", () => {
    const pos = eventIds(baseCharacter({ assets: ["pos-business"] }));
    expect(pos).toContain("pos-float-shortage");
    expect(pos).not.toContain("pos-hustle");
    const none = eventIds(baseCharacter());
    expect(none).not.toContain("pos-float-shortage");
    expect(none).toContain("pos-hustle");
    expect(eventIds(baseCharacter({ assets: ["generator"] }))).not.toContain("generator-opportunity");
    expect(eventIds(baseCharacter({ assets: ["borehole"] }))).not.toContain("borehole-opportunity");
  });

  it("a married character doesn't get the wedding event", () => {
    expect(eventIds(baseCharacter())).toContain("wedding-costs");
    expect(eventIds(baseCharacter({ spouseUid: "x", spouseName: "Y" }))).not.toContain("wedding-costs");
  });

  it("every rule points at a real event, and a broke jobless adult still has plenty of events", () => {
    const real = new Set(LIFE_EVENTS.map((e) => e.id));
    for (const id of Object.keys(EVENT_RULES)) expect(real.has(id)).toBe(true);
    const bare = eventIds(baseCharacter({ faith: "other" }));
    expect(bare.length).toBeGreaterThanOrEqual(10);
  });
});

describe("streaks, chore skills and birthdays", () => {
  it("every 5th healthy year pays a bonus", () => {
    const next = ageUp(baseCharacter({ streak: 4 }));
    expect(next.streak).toBe(5);
    expect(next.log.some((l) => l.includes("5-year"))).toBe(true);
    expect(next.stats.happiness).toBeGreaterThanOrEqual(53);
  });

  it("labor skill removes the health cost of chores", () => {
    const chore = CHORES.find((c) => c.id === "fetch-water")!;
    const trained = resolveChore(baseCharacter({ choreSkills: { labor: 30, errands: 0, finance: 0 } }), chore, true);
    const untrained = resolveChore(baseCharacter(), chore, true);
    expect(trained.stats.health).toBe(80);
    expect(untrained.stats.health).toBe(79);
  });

  it("errands skill removes the happiness cost of chores", () => {
    const chore = CHORES.find((c) => c.id === "call-landlord")!;
    const trained = resolveChore(baseCharacter({ choreSkills: { labor: 0, errands: 30, finance: 0 } }), chore, true);
    expect(trained.stats.happiness).toBe(50);
    expect(resolveChore(baseCharacter(), chore, true).stats.happiness).toBe(49);
  });

  it("finance skill discounts chore costs", () => {
    const chore = CHORES.find((c) => c.id === "market-run")!;
    const rich = baseCharacter({ stats: withNaira(5000), choreSkills: { labor: 0, errands: 0, finance: 100 } });
    expect(resolveChore(rich, chore, true).stats.naira).toBe(4000);
  });

  it("zodiac comes from the birth date", () => {
    expect(zodiacFor("2000-01-01")).toBe("Capricorn");
    expect(zodiacFor("2000-03-21")).toBe("Aries");
    expect(zodiacFor("2000-08-23")).toBe("Virgo");
    expect(zodiacFor("2000-12-22")).toBe("Capricorn");
    expect(zodiacFor("")).toBeNull();
    expect(zodiacFor("not a date")).toBeNull();
  });

  it("milestone birthdays are logged, others are silent", () => {
    expect(birthdayEffects("2000-08-23", 21).log[0]).toContain("Virgo");
    expect(birthdayEffects("2000-08-23", 22).log).toEqual([]);
    const next = ageUp(baseCharacter({ age: 17 }));
    expect(next.log.some((l) => l.includes("Birthday"))).toBe(true);
  });
});

const ELDER_ONLY_EVENT_IDS = [
  "grandchildren-visit",
  "chieftaincy-title",
  "burial-society-dues",
  "estate-planning",
  "elder-scam-call",
  "routine-checkup",
  "downsize-the-house",
  "mentor-at-work",
  "community-council-invite",
  "old-friends-reunion",
  "village-land-dispute",
  "grandchild-school-fees",
];

describe("elder band (age 60+)", () => {
  it("the band cutoff is exactly at 59/60", () => {
    expect(bandForAge(59)).toBe("adult");
    expect(bandForAge(60)).toBe("elder");
  });

  it("AGE_UP_REQUIREMENTS.elder matches .adult", () => {
    expect(AGE_UP_REQUIREMENTS.elder).toEqual(AGE_UP_REQUIREMENTS.adult);
  });

  it("an elder still sees the full adult event pool, not just the new elder-only events", () => {
    const elder = baseCharacter({ age: 65 });
    const ids = eventIds(elder);
    const adultOnlyExample = "family-request";
    expect(ids).toContain(adultOnlyExample);
  });

  it("none of the 12 new elder events ever fire below age 60", () => {
    const adult = baseCharacter({ age: 59 });
    const ids = eventIds(adult);
    for (const id of ELDER_ONLY_EVENT_IDS) {
      expect(ids).not.toContain(id);
    }
  });

  it("all 12 new elder events are reachable once eligible", () => {
    const elder = baseCharacter({
      age: 65,
      job: "tech",
      stats: withNaira(10_000_000),
      inventory: ["bungalow-2"],
    });
    const ids = eventIds(elder);
    for (const id of ELDER_ONLY_EVENT_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("the 3 gated elder events are individually blocked when ineligible", () => {
    const poor = baseCharacter({ age: 65, stats: withNaira(0) });
    const unemployed = baseCharacter({ age: 65, job: "none" });
    const homeless = baseCharacter({ age: 65, inventory: [] });
    expect(isEventAllowed(poor, { id: "chieftaincy-title" })).toBe(false);
    expect(isEventAllowed(unemployed, { id: "mentor-at-work" })).toBe(false);
    expect(isEventAllowed(homeless, { id: "downsize-the-house" })).toBe(false);
  });

  it("elder chores reuse the adult chore pool", () => {
    const elderChores = CHORES.filter((c) => c.bands.includes("elder"));
    const adultChores = CHORES.filter((c) => c.bands.includes("adult"));
    expect(elderChores.length).toBe(adultChores.length);
  });
});

describe("economy: savings, loans, interest", () => {
  describe("savings", () => {
    it("deposits move naira into savings and count as spent this year", () => {
      const c = baseCharacter({ stats: withNaira(10000), earnedThisYear: 0, spentThisYear: 0 });
      const next = depositToSavings(c, 4000);
      expect(next.stats.naira).toBe(6000);
      expect(next.savings).toBe(4000);
      expect(next.spentThisYear).toBe(4000);
    });

    it("refuses a deposit that isn't positive or exceeds current naira", () => {
      const c = baseCharacter({ stats: withNaira(1000) });
      expect(depositToSavings(c, 0).savings).toBe(0);
      expect(depositToSavings(c, -5).savings).toBe(0);
      expect(depositToSavings(c, 2000).savings).toBe(0);
    });

    it("withdrawals move savings back to naira and count as earned this year", () => {
      const c = baseCharacter({ stats: withNaira(0), savings: 5000, earnedThisYear: 0 });
      const next = withdrawFromSavings(c, 3000);
      expect(next.stats.naira).toBe(3000);
      expect(next.savings).toBe(2000);
      expect(next.earnedThisYear).toBe(3000);
    });

    it("refuses a withdrawal larger than the savings balance", () => {
      const c = baseCharacter({ savings: 1000 });
      expect(withdrawFromSavings(c, 2000).savings).toBe(1000);
    });

    it("savings compound by SAVINGS_INTEREST_RATE every ageUp, independent of stats.naira", () => {
      const c = baseCharacter({ age: 30, savings: 10000, job: "none", stats: withNaira(0) });
      const next = ageUp(c);
      expect(next.savings).toBe(Math.round(10000 * (1 + SAVINGS_INTEREST_RATE)));
    });
  });

  describe("loans", () => {
    it("taking a loan requires a job and adds to naira, counted as earned", () => {
      const unemployed = baseCharacter({ job: "none", earnedThisYear: 0 });
      expect(takeLoan(unemployed, 500000).loanBalance).toBe(0);

      const employed = baseCharacter({ job: "hawker", stats: withNaira(0), earnedThisYear: 0 });
      const next = takeLoan(employed, 500000);
      expect(next.stats.naira).toBe(500000);
      expect(next.loanBalance).toBe(500000);
      expect(next.earnedThisYear).toBe(500000);
    });

    it("refuses a second loan while one is already outstanding", () => {
      const c = baseCharacter({ job: "hawker", loanBalance: 200000 });
      expect(takeLoan(c, 100000).loanBalance).toBe(200000);
    });

    it("refuses a loan over MAX_LOAN_AMOUNT or that isn't positive", () => {
      const c = baseCharacter({ job: "hawker" });
      expect(takeLoan(c, MAX_LOAN_AMOUNT + 1).loanBalance).toBe(0);
      expect(takeLoan(c, 0).loanBalance).toBe(0);
    });

    it("repaying reduces the loan balance and naira, counted as spent", () => {
      const c = baseCharacter({ loanBalance: 100000, stats: withNaira(100000), spentThisYear: 0 });
      const next = repayLoan(c, 60000);
      expect(next.loanBalance).toBe(40000);
      expect(next.stats.naira).toBe(40000);
      expect(next.spentThisYear).toBe(60000);
    });

    it("refuses repaying more than the balance or more than the character can afford", () => {
      const c = baseCharacter({ loanBalance: 50000, stats: withNaira(1000) });
      expect(repayLoan(c, 60000).loanBalance).toBe(50000); // over the balance
      const poor = baseCharacter({ loanBalance: 50000, stats: withNaira(10) });
      expect(repayLoan(poor, 20000).loanBalance).toBe(50000); // can't afford it
    });

    it("an unpaid loan compounds by LOAN_INTEREST_RATE every ageUp", () => {
      const c = baseCharacter({ age: 30, loanBalance: 100000, job: "none", stats: withNaira(0) });
      const next = ageUp(c);
      expect(next.loanBalance).toBe(Math.round(100000 * (1 + LOAN_INTEREST_RATE)));
    });

    it("a fully repaid loan (0 balance) doesn't grow on ageUp", () => {
      const c = baseCharacter({ age: 30, loanBalance: 0, job: "none", stats: withNaira(0) });
      expect(ageUp(c).loanBalance).toBe(0);
    });
  });

  describe("debt has consequences", () => {
    it("debt-collector-visit only fires on a character actually carrying a loan", () => {
      const noDebt = baseCharacter({ age: 30, loanBalance: 0 });
      const inDebt = baseCharacter({ age: 30, loanBalance: 100000 });
      expect(isEventAllowed(noDebt, { id: "debt-collector-visit" })).toBe(false);
      expect(isEventAllowed(inDebt, { id: "debt-collector-visit" })).toBe(true);
    });

    it("loan-shark-pressure only escalates once the balance passes minDebt", () => {
      const small = baseCharacter({ age: 30, loanBalance: 50000 });
      const big = baseCharacter({ age: 30, loanBalance: 1_500_000 });
      expect(isEventAllowed(small, { id: "loan-shark-pressure" })).toBe(false);
      expect(isEventAllowed(big, { id: "loan-shark-pressure" })).toBe(true);
    });

    it("resolving a choice with repaysLoanAmount reduces loanBalance, floored at 0", () => {
      const event = LIFE_EVENTS.find((e) => e.id === "debt-collector-visit")!;
      const payIndex = event.choices.findIndex((c) => c.repaysLoanAmount);
      const c = baseCharacter({ age: 30, loanBalance: 30000, stats: withNaira(1_000_000) });
      const next = resolveEvent(c, event, payIndex);
      expect(next.loanBalance).toBe(0); // 30,000 balance - 50,000 repaysLoanAmount, floored at 0
    });
  });

  it("inflation backdrop: savings grow slower than inflation, loans grow faster", () => {
    expect(SAVINGS_INTEREST_RATE).toBeLessThan(INFLATION_RATE);
    expect(LOAN_INTEREST_RATE).toBeGreaterThan(INFLATION_RATE);
  });
});

describe("careers: promotion, firing, unemployment, entrepreneurship", () => {
  describe("job titles and levels", () => {
    it("jobTitleFor prefixes seniority onto the job's own title", () => {
      expect(jobTitleFor("hawker", 0)).toBe("Street Hawker");
      expect(jobTitleFor("hawker", 1)).toBe("Senior Street Hawker");
      expect(jobTitleFor("hawker", MAX_JOB_LEVEL)).toBe("Chief Street Hawker");
      expect(jobTitleFor("none", 0)).toBeNull();
    });

    it("takeJob resets jobLevel/yearsInJob/unemployedStreak on a (new) job", () => {
      const c = baseCharacter({ jobLevel: 2, yearsInJob: 5, unemployedStreak: 3, job: "none" });
      const next = takeJob(c, "hawker");
      expect(next.job).toBe("hawker");
      expect(next.jobLevel).toBe(0);
      expect(next.yearsInJob).toBe(0);
      expect(next.unemployedStreak).toBe(0);
    });

    it("job level scales pay by JOB_LEVEL_PAY_BONUS per level", () => {
      const entry = baseCharacter({ age: 30, job: "hawker", jobLevel: 0, stats: withNaira(0) });
      const chief = baseCharacter({ age: 30, job: "hawker", jobLevel: MAX_JOB_LEVEL, stats: withNaira(0) });
      const entryPay = ageUp(entry).earnedThisYear;
      const chiefPay = ageUp(chief).earnedThisYear;
      expect(chiefPay).toBeGreaterThan(entryPay);
      expect(chiefPay).toBeCloseTo(entryPay * (1 + MAX_JOB_LEVEL * JOB_LEVEL_PAY_BONUS), -1);
    });
  });

  describe("promotion", () => {
    it("never promotes before PROMOTION_MIN_YEARS_IN_JOB tenure", () => {
      const fresh = baseCharacter({ age: 30, job: "hawker", jobLevel: 0, yearsInJob: 0 });
      // One year in isn't enough yet (PROMOTION_MIN_YEARS_IN_JOB is 2).
      expect(ageUp(fresh).jobLevel).toBe(0);
    });

    it("over many trials, an eligible employee both does and doesn't get promoted", () => {
      let promoted = 0;
      let notPromoted = 0;
      for (let trial = 0; trial < 200; trial++) {
        const c = baseCharacter({
          age: 30,
          job: "hawker",
          jobLevel: 0,
          yearsInJob: PROMOTION_MIN_YEARS_IN_JOB,
        });
        if (ageUp(c).jobLevel > 0) promoted++;
        else notPromoted++;
      }
      expect(promoted).toBeGreaterThan(0);
      expect(notPromoted).toBeGreaterThan(0);
    });

    it("never promotes past MAX_JOB_LEVEL", () => {
      // jobLevel resets to 0 if the firing roll happens to fire this same
      // year, so the real invariant under test is "never exceeds the cap",
      // not "always stays exactly at it".
      for (let trial = 0; trial < 50; trial++) {
        const maxed = baseCharacter({
          age: 30,
          job: "hawker",
          jobLevel: MAX_JOB_LEVEL,
          yearsInJob: PROMOTION_MIN_YEARS_IN_JOB,
        });
        expect(ageUp(maxed).jobLevel).toBeLessThanOrEqual(MAX_JOB_LEVEL);
      }
    });

    it("a promotion resets yearsInJob so the next level needs its own tenure", () => {
      for (let trial = 0; trial < 200; trial++) {
        const c = baseCharacter({ age: 30, job: "hawker", jobLevel: 0, yearsInJob: PROMOTION_MIN_YEARS_IN_JOB });
        const next = ageUp(c);
        if (next.jobLevel > 0) {
          expect(next.yearsInJob).toBe(0);
          return;
        }
      }
      throw new Error("never observed a promotion across 200 trials");
    });
  });

  describe("firing and unemployment", () => {
    it("over many trials, an employed character is sometimes fired", () => {
      let fired = 0;
      for (let trial = 0; trial < 500; trial++) {
        const c = baseCharacter({ age: 30, job: "hawker", jobLevel: 1, yearsInJob: 5 });
        const next = ageUp(c);
        if (next.job === "none") {
          fired++;
          expect(next.jobLevel).toBe(0);
          expect(next.yearsInJob).toBe(0);
          expect(next.unemployedStreak).toBe(1);
        }
      }
      // FIRING_CHANCE is small (4%); 500 trials makes a zero-fired run
      // astronomically unlikely (0.96^500 ≈ 4e-9) without being flaky.
      expect(fired).toBeGreaterThan(0);
      expect(FIRING_CHANCE).toBeLessThan(0.1);
    });

    it("unemployment streak grows while job stays none", () => {
      const c = baseCharacter({ age: 30, job: "none", unemployedStreak: 1 });
      expect(ageUp(c).unemployedStreak).toBe(2);
    });

    it("sustained unemployment costs happiness via unemploymentStrain", async () => {
      const { unemploymentStrain } = await import("../src/engine/modifiers");
      expect(unemploymentStrain({ unemployedStreak: 0 })).toBe(0);
      expect(unemploymentStrain({ unemployedStreak: 2 })).toBe(0);
      expect(unemploymentStrain({ unemployedStreak: 3 })).toBeLessThan(0);
    });
  });

  describe("entrepreneurship", () => {
    it("starts a business, deducting capital and counting it as spent", () => {
      const c = baseCharacter({ stats: withNaira(1_000_000), spentThisYear: 0 });
      const next = startBusiness(c, MIN_BUSINESS_CAPITAL);
      expect(next.businessCapital).toBe(MIN_BUSINESS_CAPITAL);
      expect(next.stats.naira).toBe(1_000_000 - MIN_BUSINESS_CAPITAL);
      expect(next.spentThisYear).toBe(MIN_BUSINESS_CAPITAL);
    });

    it("refuses starting a business under MIN_BUSINESS_CAPITAL, unaffordable, or while one's already running", () => {
      const poor = baseCharacter({ stats: withNaira(100) });
      expect(startBusiness(poor, MIN_BUSINESS_CAPITAL).businessCapital).toBe(0);
      const cheap = baseCharacter({ stats: withNaira(10_000_000) });
      expect(startBusiness(cheap, MIN_BUSINESS_CAPITAL - 1).businessCapital).toBe(0);
      const running = baseCharacter({ stats: withNaira(10_000_000), businessCapital: 500_000 });
      expect(startBusiness(running, MIN_BUSINESS_CAPITAL).businessCapital).toBe(500_000);
    });

    it("closing a business recovers BUSINESS_CLOSE_RATE of the capital, not counted as earned", () => {
      const c = baseCharacter({ businessCapital: 1_000_000, stats: withNaira(0), earnedThisYear: 0 });
      const next = closeBusiness(c);
      expect(next.businessCapital).toBe(0);
      expect(next.stats.naira).toBe(Math.round(1_000_000 * BUSINESS_CLOSE_RATE));
      expect(next.earnedThisYear).toBe(0);
    });

    it("refuses closing a business that doesn't exist", () => {
      const c = baseCharacter({ businessCapital: 0 });
      expect(closeBusiness(c)).toBe(c);
    });

    it("business income is volatile year to year, and can be a loss", () => {
      const incomes = new Set<number>();
      let sawLoss = false;
      for (let trial = 0; trial < 100; trial++) {
        const c = baseCharacter({ age: 30, job: "none", businessCapital: 1_000_000, stats: withNaira(0) });
        const next = ageUp(c);
        incomes.add(next.stats.naira);
        if (next.earnedThisYear === 0 && next.stats.naira === 0) sawLoss = true;
      }
      expect(incomes.size).toBeGreaterThan(1); // genuinely different outcomes, not a fixed payout
      expect(sawLoss).toBe(true);
    });
  });
});
