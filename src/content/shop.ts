import type { StatDelta } from "./lifeEvents";

// Items a Lagos Life character can buy with naira. StatDelta here never
// includes naira — price is the separate cost deducted on purchase (see
// buyItem in lifeSim.ts) — so delta is purely the one-time stat boost
// from owning the thing. Bought items are tracked in
// LifeCharacter.inventory and can't be bought twice.
export interface ShopItem {
  id: string;
  name: string;
  category: "clothing" | "electronics" | "furniture" | "lifestyle";
  price: number;
  description: string;
  delta: StatDelta;
}

// Deliberately includes at least one very cheap item (second-hand-fan) so
// the spend-to-age-up requirement (see lifeSim.ts's AGE_UP_REQUIREMENTS)
// is always satisfiable through the shop regardless of how little a
// character has saved, not just through whatever chores happened to roll.
export const SHOP_ITEMS: ShopItem[] = [
  { id: "second-hand-fan", name: "Second-hand standing fan", category: "lifestyle", price: 500, description: "Tokunbo, but it still blows.", delta: { happiness: 1 } },
  { id: "suya-night", name: "Suya night out", category: "lifestyle", price: 2000, description: "Pepper, onions, and good company.", delta: { happiness: 3 } },
  { id: "ankara-outfit", name: "Ankara outfit", category: "clothing", price: 8000, description: "Fresh ankara, tailored to fit.", delta: { looks: 5, happiness: 2 } },
  { id: "sneakers", name: "New sneakers", category: "clothing", price: 15000, description: "Original, not from the Yaba market copies.", delta: { looks: 4, happiness: 2 } },
  { id: "gym-membership", name: "Gym membership", category: "lifestyle", price: 40000, description: "A year's worth of trying to keep fit.", delta: { health: 6, looks: 3 } },
  { id: "smartphone", name: "Smartphone", category: "electronics", price: 60000, description: "Finally, a phone that doesn't restart on its own.", delta: { happiness: 5, smarts: 2 } },
  { id: "sofa-set", name: "Sofa set", category: "furniture", price: 180000, description: "No more sitting on plastic chairs at home.", delta: { happiness: 6 } },
  { id: "air-conditioner", name: "Air conditioner", category: "furniture", price: 220000, description: "Lagos heat, finally defeated indoors.", delta: { happiness: 5, health: 3 } },
  { id: "laptop", name: "Laptop", category: "electronics", price: 250000, description: "Opens doors to real tech hustles.", delta: { smarts: 8, happiness: 3 } },
];
