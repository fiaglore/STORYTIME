import type { StatDelta } from "./lifeEvents";

// Items a Lagos Life character can buy with naira. StatDelta here never
// includes naira — price is the separate cost deducted on purchase (see
// buyItem in lifeSim.ts) — so delta is purely the one-time stat boost
// from owning the thing. Bought items are tracked in
// LifeCharacter.inventory and can't be bought twice.
export type ShopCategory =
  | "clothing"
  | "electronics"
  | "furniture"
  | "lifestyle"
  | "vehicles"
  | "jewelry"
  | "real-estate"
  | "food";

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  description: string;
  delta: StatDelta;
}

// The shop spans "dirt cheap" to "super duper luxurious" per the design
// ask — 25 product lines x 6 price tiers x 4 variants = 600 items,
// generated below rather than hand-written one by one, while keeping
// prices on the same real-Naira scale as the rest of the economy (see
// lifeEvents.ts's fuel-price-anchored header comment). Every category has
// at least one line reaching into the dirt-cheap tier, and vehicles/
// real-estate/jewelry carry the game's most expensive purchases by
// design — that's the point of a "super duper luxurious" tier existing.
interface PriceTier {
  id: string;
  label: string;
  priceMult: number;
  statMult: number;
}

const TIERS: PriceTier[] = [
  { id: "dirt-cheap", label: "Dirt Cheap", priceMult: 0.12, statMult: 0.4 },
  { id: "budget", label: "Budget", priceMult: 0.35, statMult: 0.7 },
  { id: "standard", label: "Standard", priceMult: 1, statMult: 1 },
  { id: "premium", label: "Premium", priceMult: 2.5, statMult: 1.4 },
  { id: "luxury", label: "Luxury", priceMult: 6, statMult: 1.9 },
  { id: "super-luxury", label: "Super Duper Luxurious", priceMult: 18, statMult: 2.6 },
];

// Four quality variants within each tier, so a tier isn't just one price
// point — a small, deliberate spread rather than meaningful new content.
const VARIANTS = ["Basic", "Classic", "Signature", "Special Edition"];

interface ProductLine {
  id: string;
  name: string;
  category: ShopCategory;
  basePrice: number;
  baseDelta: StatDelta;
  blurb: string;
}

const PRODUCT_LINES: ProductLine[] = [
  // clothing
  { id: "tshirt", name: "T-shirt", category: "clothing", basePrice: 4000, baseDelta: { looks: 2 }, blurb: "Everyday wear" },
  { id: "ankara-outfit", name: "Ankara outfit", category: "clothing", basePrice: 12000, baseDelta: { looks: 5, happiness: 2 }, blurb: "Fresh ankara, tailored to fit" },
  { id: "sneakers", name: "Sneakers", category: "clothing", basePrice: 15000, baseDelta: { looks: 4, happiness: 2 }, blurb: "For the street and the gym" },
  { id: "suit", name: "Suit", category: "clothing", basePrice: 35000, baseDelta: { looks: 7, smarts: 1 }, blurb: "For interviews and owambe alike" },
  // electronics
  { id: "earpiece", name: "Earpiece", category: "electronics", basePrice: 3000, baseDelta: { happiness: 1 }, blurb: "For calls on the go" },
  { id: "bluetooth-speaker", name: "Bluetooth speaker", category: "electronics", basePrice: 10000, baseDelta: { happiness: 3 }, blurb: "Music wherever you are" },
  { id: "smartphone", name: "Smartphone", category: "electronics", basePrice: 70000, baseDelta: { happiness: 4, smarts: 2 }, blurb: "A phone that doesn't restart on its own" },
  { id: "laptop", name: "Laptop", category: "electronics", basePrice: 220000, baseDelta: { smarts: 8, happiness: 2 }, blurb: "Opens doors to real tech hustles" },
  { id: "smart-tv", name: "Smart TV", category: "electronics", basePrice: 180000, baseDelta: { happiness: 6 }, blurb: "Big screen, better evenings" },
  // furniture
  { id: "plastic-chair", name: "Plastic chair set", category: "furniture", basePrice: 6000, baseDelta: { happiness: 1 }, blurb: "Somewhere to sit, at least" },
  { id: "sofa-set", name: "Sofa set", category: "furniture", basePrice: 180000, baseDelta: { happiness: 6 }, blurb: "No more sitting on plastic chairs at home" },
  { id: "dining-set", name: "Dining set", category: "furniture", basePrice: 120000, baseDelta: { happiness: 4 }, blurb: "A proper table for proper meals" },
  { id: "air-conditioner", name: "Air conditioner", category: "furniture", basePrice: 220000, baseDelta: { happiness: 5, health: 3 }, blurb: "Lagos heat, finally defeated indoors" },
  // lifestyle
  { id: "suya-night", name: "Suya night out", category: "lifestyle", basePrice: 2000, baseDelta: { happiness: 3 }, blurb: "Pepper, onions, and good company" },
  { id: "gym-membership", name: "Gym membership", category: "lifestyle", basePrice: 40000, baseDelta: { health: 6, looks: 3 }, blurb: "A year's worth of trying to keep fit" },
  { id: "spa-day", name: "Spa day", category: "lifestyle", basePrice: 25000, baseDelta: { happiness: 5, looks: 2 }, blurb: "An afternoon of doing absolutely nothing" },
  { id: "vacation", name: "Vacation package", category: "lifestyle", basePrice: 450000, baseDelta: { happiness: 10, health: 3 }, blurb: "A proper break from Lagos" },
  // vehicles
  { id: "bicycle", name: "Bicycle", category: "vehicles", basePrice: 25000, baseDelta: { health: 3, happiness: 2 }, blurb: "Beats trekking, cheaper than a keke" },
  { id: "tricycle", name: "Keke", category: "vehicles", basePrice: 900000, baseDelta: { happiness: 4 }, blurb: "Your own ride, no more haggling fares" },
  { id: "car", name: "Car", category: "vehicles", basePrice: 3500000, baseDelta: { happiness: 8, looks: 3 }, blurb: "Door-to-door, rain or shine" },
  // jewelry
  { id: "wristwatch", name: "Wristwatch", category: "jewelry", basePrice: 15000, baseDelta: { looks: 4 }, blurb: "Always know the time, always look sharp" },
  { id: "gold-chain", name: "Gold chain", category: "jewelry", basePrice: 90000, baseDelta: { looks: 6, happiness: 2 }, blurb: "Shine a little, every day" },
  // real estate
  { id: "land-plot", name: "Plot of land", category: "real-estate", basePrice: 4000000, baseDelta: { happiness: 6 }, blurb: "Something solid to call yours" },
  { id: "house", name: "House", category: "real-estate", basePrice: 18000000, baseDelta: { happiness: 15, health: 2 }, blurb: "A roof nobody can take from you" },
  // food
  { id: "weekly-groceries", name: "Weekly groceries", category: "food", basePrice: 8000, baseDelta: { health: 2, happiness: 1 }, blurb: "A full fridge for the week" },
];

function scaleDelta(delta: StatDelta, mult: number): StatDelta {
  const scaled: StatDelta = {};
  for (const key of Object.keys(delta) as (keyof StatDelta)[]) {
    const value = delta[key];
    if (value != null) scaled[key] = Math.max(1, Math.round(value * mult));
  }
  return scaled;
}

function roundPrice(price: number): number {
  const step = price >= 1_000_000 ? 10_000 : price >= 100_000 ? 1_000 : price >= 10_000 ? 100 : 50;
  return Math.max(step, Math.round(price / step) * step);
}

function generateShopItems(): ShopItem[] {
  const items: ShopItem[] = [];
  for (const line of PRODUCT_LINES) {
    for (const tier of TIERS) {
      VARIANTS.forEach((variant, i) => {
        // A small, deterministic spread within the tier (±12%) so the
        // four variants aren't identically priced, without needing
        // per-variant content of their own.
        const variantMult = 0.88 + i * 0.08;
        items.push({
          id: `${line.id}-${tier.id}-${i}`,
          name: `${variant} ${line.name} (${tier.label})`,
          category: line.category,
          price: roundPrice(line.basePrice * tier.priceMult * variantMult),
          description: `${line.blurb} — ${tier.label.toLowerCase()} tier.`,
          delta: scaleDelta(line.baseDelta, tier.statMult),
        });
      });
    }
  }
  return items;
}

// Deliberately includes very cheap items (the dirt-cheap tier of every
// product line) so the spend-to-age-up requirement (see lifeSim.ts's
// AGE_UP_REQUIREMENTS) is always satisfiable through the shop regardless
// of how little a character has saved, not just through whatever chores
// happened to roll.
export const SHOP_ITEMS: ShopItem[] = generateShopItems();

export const SHOP_CATEGORIES: ShopCategory[] = [
  "clothing",
  "electronics",
  "furniture",
  "lifestyle",
  "vehicles",
  "jewelry",
  "real-estate",
  "food",
];
