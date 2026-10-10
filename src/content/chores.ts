import type { AgeBand, StatDelta } from "./lifeEvents";

// Small, low-stakes, single-click tasks a Lagos Life character has to clear
// before Age Up is available for the year — the daily grind itself (fetch
// water, queue for fuel, commute) rather than a dramatic life event. There's
// no choice to make, just a "Done" tap; the friction is in there being
// several of them every year, not in any one being hard. See
// src/engine/lifeSim.ts's resolveChore / pickChores and LifeSim.tsx's
// CHORES_PER_YEAR for how this is wired into the age-up loop.
export interface Chore {
  id: string;
  bands: AgeBand[];
  text: string;
  delta: StatDelta;
}

export const CHORES: Chore[] = [
  { id: "fetch-water", bands: ["child", "teen"], text: "Fetch water from the compound tap before school.", delta: { health: -1 } },
  { id: "sweep-frontage", bands: ["child", "teen"], text: "Sweep the frontage before Mama wakes up.", delta: { happiness: 1 } },
  { id: "help-pound-yam", bands: ["child", "teen"], text: "Help pound yam for dinner — your arms are dead after.", delta: { health: -1, happiness: 1 } },
  { id: "homework-check", bands: ["child"], text: "Mama checks your homework before you can go outside.", delta: { smarts: 1 } },
  { id: "errand-shop", bands: ["child", "teen"], text: "Run to the corner shop for Mama — she's counting the change.", delta: {} },
  { id: "charge-phone", bands: ["teen", "adult"], text: "Queue at the kiosk to charge your phone.", delta: { naira: -100 } },
  { id: "check-family", bands: ["teen", "adult"], text: "Call to check on the family back home.", delta: { happiness: 1 } },
  { id: "commute", bands: ["adult"], text: "Battle the morning go-slow to get to work.", delta: { happiness: -1 } },
  { id: "cook-dinner", bands: ["adult"], text: "Cook dinner before NEPA takes the light again.", delta: {} },
  { id: "bank-queue", bands: ["adult"], text: "Queue at the bank just to withdraw cash.", delta: { happiness: -1 } },
  { id: "market-run", bands: ["adult"], text: "Run to the market for the week's foodstuff.", delta: { naira: -2000 } },
  { id: "fuel-queue", bands: ["adult"], text: "Queue for fuel at the filling station — na so e be.", delta: { naira: -1400, health: -1 } },
  { id: "laundry", bands: ["adult", "teen"], text: "Wash and hang the week's laundry before the rain comes.", delta: { health: -1 } },
  { id: "sweep-compound", bands: ["adult"], text: "It's your turn to sweep the shared compound.", delta: {} },
  { id: "call-landlord", bands: ["adult"], text: "Dodge the landlord's call about the gutter repair levy.", delta: { happiness: -1 } },
  { id: "data-bundle", bands: ["teen", "adult"], text: "Your data don finish mid-download — top up again.", delta: { naira: -1000 } },
  { id: "waste-collector", bands: ["adult"], text: "Pay the waste collector boy before he vexes.", delta: { naira: -500 } },
  { id: "keke-squeeze", bands: ["adult"], text: "Squeeze into a keke to beat the morning rush.", delta: { naira: -300 } },
];

export function pickChores(band: AgeBand, count: number): Chore[] {
  const pool = CHORES.filter((c) => c.bands.includes(band));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
