import type { AssetId } from "./lifeEvents";
import { SHOP_ITEMS, type ShopItem } from "./shop";
import type { LifeCharacter } from "../engine/lifeSim";

// What owning things actually DOES. Shop items used to be a one-time stat
// bump and assets were mostly flags; this module is the single place that
// says what a car, a home, a POS machine or a shop space changes.
//
// Shop item ids look like "<product-line>-<tier 0-4>" (see shop.ts), so
// ownership is checked by product line.

export type OwnedGroup = "car" | "home";

const GROUP_LINES: Record<OwnedGroup, string[]> = {
  car: ["sedan-car", "suv", "pickup-truck", "sports-car", "luxury-car", "armored-suv", "vintage-car"],
  home: [
    "studio-apartment",
    "two-bedroom-flat",
    "duplex",
    "bungalow",
    "terrace-house",
    "beachfront-villa",
    "penthouse",
    "private-estate",
    "island-property",
    "skyscraper-floor",
  ],
};

export const GROUP_PERK_TEXT: Record<OwnedGroup, string> = {
  car: "Skips the commute chores and the danfo, keke and okada trouble.",
  home: "No more rent hikes, landlord calls or agent fees.",
};

export function lineOf(itemId: string): string {
  return itemId.replace(/-\d+$/, "");
}

export function owns(character: Pick<LifeCharacter, "inventory">, group: OwnedGroup): boolean {
  return (character.inventory ?? []).some((id) => GROUP_LINES[group].includes(lineOf(id)));
}

// Chores that stop being offered once you own the thing that makes them moot.
const CHORE_EXCLUDED_BY: Record<string, OwnedGroup[]> = {
  commute: ["car"],
  "keke-squeeze": ["car"],
  "brt-queue": ["car"],
  "call-landlord": ["home"],
  "sweep-compound": ["home"],
};

export function choreAllowedByOwnership(choreId: string, character: Pick<LifeCharacter, "inventory">): boolean {
  const excluded = CHORE_EXCLUDED_BY[choreId];
  return !excluded || !excluded.some((group) => owns(character, group));
}

// Yearly income from durable assets (see AssetId in lifeEvents.ts).
export const ASSET_INCOME: Partial<Record<AssetId, number>> = {
  "pos-business": 45_000,
  borehole: 25_000,
  "logistics-business": 300_000,
};

export const ASSET_LABELS: Record<AssetId, string> = {
  generator: "generator",
  "pos-business": "POS business",
  borehole: "borehole",
  "logistics-business": "logistics business",
};

// Yearly perks of durable shop items, per product line. A line counts once
// no matter how many brand tiers you own; yieldRate is per item (rent or
// business income as a fraction of the item's price).
interface ItemPerk {
  health?: number;
  smarts?: number;
  happiness?: number;
  yieldRate?: number;
}

const ITEM_PERKS: Record<string, ItemPerk> = {
  mattress: { health: 1 },
  "four-poster-bed": { health: 1 },
  bicycle: { health: 1 },
  smartwatch: { health: 1 },
  "gym-membership": { health: 2 },
  bookshelf: { smarts: 1 },
  laptop: { smarts: 1 },
  "tricycle-cart": { yieldRate: 0.2 },
  motorcycle: { yieldRate: 0.12 },
  keke: { yieldRate: 0.12 },
  "pickup-truck": { yieldRate: 0.06 },
  "land-plot": { yieldRate: 0.02 },
  "shop-space": { yieldRate: 0.05 },
  "office-space": { yieldRate: 0.06 },
  warehouse: { yieldRate: 0.06 },
};

const PERK_CAPS = { health: 3, smarts: 2, happiness: 3 };

let priceById: Map<string, number> | null = null;
function priceOf(itemId: string): number {
  if (!priceById) priceById = new Map(SHOP_ITEMS.map((i) => [i.id, i.price]));
  return priceById.get(itemId) ?? 0;
}

export interface PassiveEffects {
  naira: number;
  health: number;
  smarts: number;
  happiness: number;
  log: string[];
}

// Everything owned things add at the start of a new year, folded into
// ageUp. Naira from here counts as earned for the year.
export function yearlyPassiveEffects(character: LifeCharacter, age: number): PassiveEffects {
  const out: PassiveEffects = { naira: 0, health: 0, smarts: 0, happiness: 0, log: [] };

  for (const asset of character.assets ?? []) {
    const income = ASSET_INCOME[asset];
    if (!income) continue;
    out.naira += income;
    out.log.push(`Age ${age}: Your ${ASSET_LABELS[asset]} brought in ₦${income.toLocaleString()}.`);
  }

  let rent = 0;
  const seenLines = new Set<string>();
  for (const id of character.inventory ?? []) {
    const line = lineOf(id);
    const perk = ITEM_PERKS[line];
    if (!perk) continue;
    if (!seenLines.has(line)) {
      seenLines.add(line);
      out.health += perk.health ?? 0;
      out.smarts += perk.smarts ?? 0;
      out.happiness += perk.happiness ?? 0;
    }
    if (perk.yieldRate) rent += Math.round(priceOf(id) * perk.yieldRate);
  }
  if (rent > 0) {
    out.naira += rent;
    out.log.push(`Age ${age}: Your property and equipment earned ₦${rent.toLocaleString()}.`);
  }

  out.health = Math.min(PERK_CAPS.health, out.health);
  out.smarts = Math.min(PERK_CAPS.smarts, out.smarts);
  out.happiness = Math.min(PERK_CAPS.happiness, out.happiness);
  return out;
}

// Human-readable perks for the inventory screen.
export function describeItemPerks(item: ShopItem): string[] {
  const lines: string[] = [];
  const line = lineOf(item.id);
  const perk = ITEM_PERKS[line];
  if (perk?.health) lines.push(`+${perk.health} health a year`);
  if (perk?.smarts) lines.push(`+${perk.smarts} smarts a year`);
  if (perk?.happiness) lines.push(`+${perk.happiness} happiness a year`);
  if (perk?.yieldRate) lines.push(`Earns about ₦${Math.round(item.price * perk.yieldRate).toLocaleString()} a year`);
  for (const group of Object.keys(GROUP_LINES) as OwnedGroup[]) {
    if (GROUP_LINES[group].includes(line)) lines.push(GROUP_PERK_TEXT[group]);
  }
  return lines;
}
