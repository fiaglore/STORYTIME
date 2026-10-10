cat << 'EOF' > apply-systems-fix.mjs
// Run from the repo root:  node apply-systems-fix.mjs
//
// Fix for gap #2: dead or cosmetic systems. Makes smarts/looks/happiness,
// assets, shop items, event filtering (wealth/faith/job), birth date,
// streaks and chore skills actually change gameplay. Requires the
// childhood fix (apply-childhood-fix.mjs) to be applied first.
//
// All-or-nothing: every edit is applied in memory first; nothing is written
// unless every edit matched.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DATA = {
 "edits": [
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "import { SCHOOLS, schoolsAvailableTo, type School } from \"../content/schools\";\n",
   "replace": "import { SCHOOLS, schoolsAvailableTo, type School } from \"../content/schools\";\nimport { isEventAllowed } from \"../content/eventRules\";\nimport { yearlyPassiveEffects } from \"../content/ownership\";\nimport {\n  JOB_MIN_SMARTS,\n  applyChoreSkillPerks,\n  birthdayEffects,\n  hustleMultiplier,\n  laborFitnessBonus,\n  moodHealthDrift,\n  payMultiplier,\n  streakReward,\n} from \"./modifiers\";\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "  schoolId: string | null;\n  ateThisYear: boolean;\n  classroomTalksThisYear: number;\n  pensionSavings: number;\n}\n",
   "replace": "  schoolId: string | null;\n  ateThisYear: boolean;\n  classroomTalksThisYear: number;\n  pensionSavings: number;\n  // Shop item ids this character has sold. A sold item can't be bought back\n  // (otherwise buy/sell/rebuy would farm its one-time stat boost). Optional so\n  // older saves load fine.\n  soldItemIds?: string[];\n}\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "  if (character.age < job.minAge) return false;\n",
   "replace": "  if (character.age < job.minAge) return false;\n  if (character.stats.smarts < (JOB_MIN_SMARTS[job.id] ?? 0)) return false;\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "const pool = LIFE_EVENTS.filter((e) => e.bands.includes(band));",
   "replace": "const pool = LIFE_EVENTS.filter((e) => e.bands.includes(band) && isEventAllowed(character, e));",
   "count": 2
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "  const income = jobIncome(character.job);\n",
   "replace": "  const passive = yearlyPassiveEffects(character, nextAge);\n  // Smarts scale pay; owned assets and property add passive income on top.\n  const income = Math.round(jobIncome(character.job) * payMultiplier(character)) + passive.naira;\n  const birthday = birthdayEffects(character.birthDate, nextAge);\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "    health: randomInt(-2, 1) - Math.max(0, Math.floor((nextAge - 60) / 10)),\n    happiness: randomInt(-1, 1) + (schoolDelta.happiness ?? 0),\n    naira: income + (schoolDelta.naira ?? 0),\n    smarts: schoolDelta.smarts ?? 0,\n",
   "replace": "    health:\n      randomInt(-2, 1) -\n      Math.max(0, Math.floor((nextAge - 60) / 10)) +\n      moodHealthDrift(character) +\n      passive.health +\n      laborFitnessBonus(character),\n    happiness: randomInt(-1, 1) + (schoolDelta.happiness ?? 0) + passive.happiness + birthday.happiness,\n    naira: income + (schoolDelta.naira ?? 0),\n    smarts: (schoolDelta.smarts ?? 0) + passive.smarts,\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "    hustlesThisYear: 0,\n    prayersThisYear: 0,\n  };\n  const cause = checkDeath(next);\n",
   "replace": "    hustlesThisYear: 0,\n    prayersThisYear: 0,\n    log: [...character.log, ...birthday.log, ...passive.log],\n  };\n  const reward = streakReward(next.streak);\n  if (reward) {\n    next.stats = applyDelta(next.stats, reward.delta);\n    next.log = [...next.log, `Age ${nextAge}: ${reward.text}`];\n  }\n  const cause = checkDeath(next);\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "  if (character.inventory.includes(item.id) || character.stats.naira < item.price) return character;",
   "replace": "  if (\n    character.inventory.includes(item.id) ||\n    (character.soldItemIds ?? []).includes(item.id) ||\n    character.stats.naira < item.price\n  ) {\n    return character;\n  }",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "// Trains one skill point session",
   "replace": "// What a sold item fetches, as a fraction of its price (depreciation).\nexport const SELL_RATE = 0.5;\n\n// Sells an owned shop item for SELL_RATE of its price. The one-time stat\n// boost it gave stays. Deliberately NOT counted as earned for the year, so\n// flipping items can't be used to skip Age Up's earn requirement, and the\n// item can't be bought back (see soldItemIds).\nexport function sellItem(character: LifeCharacter, item: ShopItem): LifeCharacter {\n  if (!character.inventory.includes(item.id)) return character;\n  const refund = Math.floor(item.price * SELL_RATE);\n  return {\n    ...character,\n    stats: applyDelta(character.stats, { naira: refund }),\n    inventory: character.inventory.filter((id) => id !== item.id),\n    soldItemIds: [...(character.soldItemIds ?? []), item.id],\n    log: [...character.log, `Age ${character.age}: Sold a ${item.name.toLowerCase()} for ₦${refund.toLocaleString()}.`],\n  };\n}\n\n// Trains one skill point session",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "  const gain = randomInt(1200, 2800);",
   "replace": "  const gain = Math.round(randomInt(1200, 2800) * hustleMultiplier(character));",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/engine/lifeSim.ts",
   "find": "  const delta = passed ? chore.delta : { ...chore.delta, happiness: (chore.delta.happiness ?? 0) - 3 };",
   "replace": "  const perked = applyChoreSkillPerks(character.choreSkills, chore.category, chore.delta);\n  const delta = passed ? perked : { ...perked, happiness: (perked.happiness ?? 0) - 3 };",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/content/lifeEvents.ts",
   "find": "export type AssetId = \"generator\" | \"pos-business\" | \"borehole\";",
   "replace": "export type AssetId = \"generator\" | \"pos-business\" | \"borehole\" | \"logistics-business\";",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/content/chores.ts",
   "find": "import type { LifeCharacter } from \"../engine/lifeSim\";\n",
   "replace": "import type { LifeCharacter } from \"../engine/lifeSim\";\nimport { choreAllowedByOwnership } from \"./ownership\";\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/content/chores.ts",
   "find": "  if (chore.excludesAsset && character.assets.includes(chore.excludesAsset)) return false;\n  return true;\n",
   "replace": "  if (chore.excludesAsset && character.assets.includes(chore.excludesAsset)) return false;\n  if (!choreAllowedByOwnership(chore.id, character)) return false;\n  return true;\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "  rollYearWork,\n",
   "replace": "  rollYearWork,\n  sellItem,\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "import { Settings } from \"./Settings\";\n",
   "replace": "import { Settings } from \"./Settings\";\nimport { Inventory } from \"./Inventory\";\nimport { zodiacFor } from \"../engine/modifiers\";\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "  const [shopSearch, setShopSearch] = useState(\"\");\n",
   "replace": "  const [shopSearch, setShopSearch] = useState(\"\");\n  const [shopView, setShopView] = useState<\"browse\" | \"owned\">(\"browse\");\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "          {character.name} · Age {character.age}\n",
   "replace": "          {character.name} · Age {character.age}\n          {zodiacFor(character.birthDate) ? ` · ${zodiacFor(character.birthDate)}` : \"\"}\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "      {showShop && (\n        <div className=\"lifesim-shop\">\n",
   "replace": "      {showShop && (\n        <div className=\"lifesim-tabs\">\n          <button\n            className={`lifesim-tab ${shopView === \"browse\" ? \"lifesim-tab--active\" : \"\"}`}\n            onClick={() => setShopView(\"browse\")}\n          >\n            Browse\n          </button>\n          <button\n            className={`lifesim-tab ${shopView === \"owned\" ? \"lifesim-tab--active\" : \"\"}`}\n            onClick={() => setShopView(\"owned\")}\n          >\n            My stuff\n          </button>\n        </div>\n      )}\n\n      {showShop && shopView === \"owned\" && (\n        <Inventory character={character} onSell={(item) => setCharacter(sellItem(character, item))} />\n      )}\n\n      {showShop && shopView === \"browse\" && (\n        <div className=\"lifesim-shop\">\n",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "              const owned = character.inventory.includes(item.id);",
   "replace": "              const sold = (character.soldItemIds ?? []).includes(item.id);\n              const owned = character.inventory.includes(item.id) || sold;",
   "count": 1
  },
  {
   "kind": "replace",
   "file": "src/ui/LifeSim.tsx",
   "find": "{owned ? \"Owned\" : ",
   "replace": "{owned ? (sold ? \"Sold\" : \"Owned\") : ",
   "count": 1
  }
 ],
 "newFiles": {
  "src/engine/modifiers.ts": "import type { ChoreCategory } from \"../content/chores\";\nimport type { StatDelta } from \"../content/lifeEvents\";\nimport type { LifeCharacter } from \"./lifeSim\";\n\n// Pure rules that make the \"soft\" stats matter. Nothing here touches state;\n// lifeSim.ts calls these from ageUp / hustle / resolveChore / job gating.\n\n// Smarts scale what a job pays: 0 smarts = 80%, 50 = 100%, 100 = 120%.\nexport function payMultiplier(character: Pick<LifeCharacter, \"stats\">): number {\n  return 0.8 + character.stats.smarts / 250;\n}\n\n// Looks scale hustle (street-level) earnings: 90% at 0, 100% at 50, 110% at 100.\n// Floor of 0.9 matters: 3 hustles x 1,200 x 0.9 must still clear the adult\n// earn requirement (see the hustle regression test).\nexport function hustleMultiplier(character: Pick<LifeCharacter, \"stats\">): number {\n  return 0.9 + character.stats.looks / 500;\n}\n\n// Yearly health effect of mood. Rock-bottom happiness wears the body down;\n// a genuinely happy life is slightly protective.\nexport function moodHealthDrift(character: Pick<LifeCharacter, \"stats\">): number {\n  const h = character.stats.happiness;\n  if (h <= 0) return -3;\n  if (h < 15) return -1;\n  if (h >= 85) return 1;\n  return 0;\n}\n\n// Minimum smarts before a job is offered, on top of its skill requirement.\nexport const JOB_MIN_SMARTS: Partial<Record<string, number>> = {\n  \"civil-servant\": 30,\n  tech: 40,\n};\n\n// Strong labor chore skill keeps you fit.\nexport function laborFitnessBonus(character: Pick<LifeCharacter, \"choreSkills\">): number {\n  return (character.choreSkills?.labor ?? 0) >= 60 ? 1 : 0;\n}\n\n// Every 5th consecutive healthy year pays out.\nexport function streakReward(streak: number): { delta: StatDelta; text: string } | null {\n  if (streak > 0 && streak % 5 === 0) {\n    return {\n      delta: { happiness: 3, health: 2 },\n      text: `${streak}-year streak of staying healthy — you feel unstoppable.`,\n    };\n  }\n  return null;\n}\n\n// What leveling a chore category actually buys you:\n//   labor    >= 30: chores stop costing health\n//   errands  >= 30: chores stop costing happiness\n//   finance  any:   chores' naira costs shrink by level/2 percent (max 50%)\n// Applied to the chore's own delta only; the failed-challenge penalty is added after.\nexport function applyChoreSkillPerks(\n  skills: Record<ChoreCategory, number> | undefined,\n  category: ChoreCategory,\n  delta: StatDelta,\n): StatDelta {\n  const level = skills?.[category] ?? 0;\n  const out: StatDelta = { ...delta };\n  const health = out.health ?? 0;\n  const happiness = out.happiness ?? 0;\n  const naira = out.naira ?? 0;\n  if (category === \"labor\" && level >= 30 && health < 0) out.health = Math.min(0, health + 1);\n  if (category === \"errands\" && level >= 30 && happiness < 0) out.happiness = Math.min(0, happiness + 1);\n  if (category === \"finance\" && naira < 0) {\n    out.naira = -Math.round(Math.abs(naira) * (1 - Math.min(0.5, level / 200)));\n  }\n  return out;\n}\n\nconst ZODIAC_STARTS: [number, number, string][] = [\n  [1, 20, \"Aquarius\"],\n  [2, 19, \"Pisces\"],\n  [3, 21, \"Aries\"],\n  [4, 20, \"Taurus\"],\n  [5, 21, \"Gemini\"],\n  [6, 21, \"Cancer\"],\n  [7, 23, \"Leo\"],\n  [8, 23, \"Virgo\"],\n  [9, 23, \"Libra\"],\n  [10, 23, \"Scorpio\"],\n  [11, 22, \"Sagittarius\"],\n  [12, 22, \"Capricorn\"],\n];\n\nconst ZODIAC_TRAITS: Record<string, string> = {\n  Capricorn: \"stubborn and driven.\",\n  Aquarius: \"restless and original.\",\n  Pisces: \"dreamy and soft-hearted.\",\n  Aries: \"bold, and in a hurry.\",\n  Taurus: \"steady, and fond of good food.\",\n  Gemini: \"chatty and curious.\",\n  Cancer: \"protective of family.\",\n  Leo: \"proud, and loves an audience.\",\n  Virgo: \"careful with details.\",\n  Libra: \"a born peacemaker.\",\n  Scorpio: \"intense and private.\",\n  Sagittarius: \"adventurous and blunt.\",\n};\n\nfunction parseBirthDate(birthDate: string): { month: number; day: number } | null {\n  const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(birthDate ?? \"\");\n  if (!m) return null;\n  const month = Number(m[2]);\n  const day = Number(m[3]);\n  if (month < 1 || month > 12 || day < 1 || day > 31) return null;\n  return { month, day };\n}\n\nexport function zodiacFor(birthDate: string): string | null {\n  const parsed = parseBirthDate(birthDate);\n  if (!parsed) return null;\n  let sign = \"Capricorn\";\n  for (const [m, d, name] of ZODIAC_STARTS) {\n    if (parsed.month > m || (parsed.month === m && parsed.day >= d)) sign = name;\n  }\n  return sign;\n}\n\nconst MILESTONE_BIRTHDAYS: Record<number, string> = {\n  1: \"First birthday — the whole family crowds around the cake.\",\n  5: \"Turned 5 — a big deal in the compound.\",\n  10: \"Double digits — you tell everyone you meet.\",\n  13: \"Turned 13 — officially a teenager.\",\n  16: \"Turned 16 — everyone suddenly has advice.\",\n  18: \"Turned 18 — officially an adult, for better or worse.\",\n  21: \"Turned 21 — the family asks what your plan is.\",\n  30: \"Turned 30 — the aunties start asking questions.\",\n  40: \"Turned 40 — you've earned your opinions.\",\n  50: \"Turned 50 — half a century in Lagos.\",\n  60: \"Turned 60 — elder status, and everyone listens a little more.\",\n  70: \"Turned 70 — the whole family comes to celebrate.\",\n  80: \"Turned 80 — a long road, well travelled.\",\n};\n\n// Every birthday is a small happiness bump; milestone ones also get a log\n// line (ages 1 and 21 mention the zodiac sign). birthDate is the date chosen\n// at character creation; an unreadable one just skips the zodiac.\nexport function birthdayEffects(birthDate: string, age: number): { happiness: number; log: string[] } {\n  const text = MILESTONE_BIRTHDAYS[age];\n  if (!text) return { happiness: 1, log: [] };\n  const sign = age === 1 || age === 21 ? zodiacFor(birthDate) : null;\n  const extra = sign ? ` You're a ${sign}: ${ZODIAC_TRAITS[sign]}` : \"\";\n  return { happiness: 1, log: [`Age ${age}: Birthday — ${text}${extra}`] };\n}\n",
  "src/content/ownership.ts": "import type { AssetId } from \"./lifeEvents\";\nimport { SHOP_ITEMS, type ShopItem } from \"./shop\";\nimport type { LifeCharacter } from \"../engine/lifeSim\";\n\n// What owning things actually DOES. Shop items used to be a one-time stat\n// bump and assets were mostly flags; this module is the single place that\n// says what a car, a home, a POS machine or a shop space changes.\n//\n// Shop item ids look like \"<product-line>-<tier 0-4>\" (see shop.ts), so\n// ownership is checked by product line.\n\nexport type OwnedGroup = \"car\" | \"home\";\n\nconst GROUP_LINES: Record<OwnedGroup, string[]> = {\n  car: [\"sedan-car\", \"suv\", \"pickup-truck\", \"sports-car\", \"luxury-car\", \"armored-suv\", \"vintage-car\"],\n  home: [\n    \"studio-apartment\",\n    \"two-bedroom-flat\",\n    \"duplex\",\n    \"bungalow\",\n    \"terrace-house\",\n    \"beachfront-villa\",\n    \"penthouse\",\n    \"private-estate\",\n    \"island-property\",\n    \"skyscraper-floor\",\n  ],\n};\n\nexport const GROUP_PERK_TEXT: Record<OwnedGroup, string> = {\n  car: \"Skips the commute chores and the danfo, keke and okada trouble.\",\n  home: \"No more rent hikes, landlord calls or agent fees.\",\n};\n\nexport function lineOf(itemId: string): string {\n  return itemId.replace(/-\\d+$/, \"\");\n}\n\nexport function owns(character: Pick<LifeCharacter, \"inventory\">, group: OwnedGroup): boolean {\n  return (character.inventory ?? []).some((id) => GROUP_LINES[group].includes(lineOf(id)));\n}\n\n// Chores that stop being offered once you own the thing that makes them moot.\nconst CHORE_EXCLUDED_BY: Record<string, OwnedGroup[]> = {\n  commute: [\"car\"],\n  \"keke-squeeze\": [\"car\"],\n  \"brt-queue\": [\"car\"],\n  \"call-landlord\": [\"home\"],\n  \"sweep-compound\": [\"home\"],\n};\n\nexport function choreAllowedByOwnership(choreId: string, character: Pick<LifeCharacter, \"inventory\">): boolean {\n  const excluded = CHORE_EXCLUDED_BY[choreId];\n  return !excluded || !excluded.some((group) => owns(character, group));\n}\n\n// Yearly income from durable assets (see AssetId in lifeEvents.ts).\nexport const ASSET_INCOME: Partial<Record<AssetId, number>> = {\n  \"pos-business\": 45_000,\n  borehole: 25_000,\n  \"logistics-business\": 300_000,\n};\n\nexport const ASSET_LABELS: Record<AssetId, string> = {\n  generator: \"generator\",\n  \"pos-business\": \"POS business\",\n  borehole: \"borehole\",\n  \"logistics-business\": \"logistics business\",\n};\n\n// Yearly perks of durable shop items, per product line. A line counts once\n// no matter how many brand tiers you own; yieldRate is per item (rent or\n// business income as a fraction of the item's price).\ninterface ItemPerk {\n  health?: number;\n  smarts?: number;\n  happiness?: number;\n  yieldRate?: number;\n}\n\nconst ITEM_PERKS: Record<string, ItemPerk> = {\n  mattress: { health: 1 },\n  \"four-poster-bed\": { health: 1 },\n  bicycle: { health: 1 },\n  smartwatch: { health: 1 },\n  \"gym-membership\": { health: 2 },\n  bookshelf: { smarts: 1 },\n  laptop: { smarts: 1 },\n  \"tricycle-cart\": { yieldRate: 0.2 },\n  motorcycle: { yieldRate: 0.12 },\n  keke: { yieldRate: 0.12 },\n  \"pickup-truck\": { yieldRate: 0.06 },\n  \"land-plot\": { yieldRate: 0.02 },\n  \"shop-space\": { yieldRate: 0.05 },\n  \"office-space\": { yieldRate: 0.06 },\n  warehouse: { yieldRate: 0.06 },\n};\n\nconst PERK_CAPS = { health: 3, smarts: 2, happiness: 3 };\n\nlet priceById: Map<string, number> | null = null;\nfunction priceOf(itemId: string): number {\n  if (!priceById) priceById = new Map(SHOP_ITEMS.map((i) => [i.id, i.price]));\n  return priceById.get(itemId) ?? 0;\n}\n\nexport interface PassiveEffects {\n  naira: number;\n  health: number;\n  smarts: number;\n  happiness: number;\n  log: string[];\n}\n\n// Everything owned things add at the start of a new year, folded into\n// ageUp. Naira from here counts as earned for the year.\nexport function yearlyPassiveEffects(character: LifeCharacter, age: number): PassiveEffects {\n  const out: PassiveEffects = { naira: 0, health: 0, smarts: 0, happiness: 0, log: [] };\n\n  for (const asset of character.assets ?? []) {\n    const income = ASSET_INCOME[asset];\n    if (!income) continue;\n    out.naira += income;\n    out.log.push(`Age ${age}: Your ${ASSET_LABELS[asset]} brought in ₦${income.toLocaleString()}.`);\n  }\n\n  let rent = 0;\n  const seenLines = new Set<string>();\n  for (const id of character.inventory ?? []) {\n    const line = lineOf(id);\n    const perk = ITEM_PERKS[line];\n    if (!perk) continue;\n    if (!seenLines.has(line)) {\n      seenLines.add(line);\n      out.health += perk.health ?? 0;\n      out.smarts += perk.smarts ?? 0;\n      out.happiness += perk.happiness ?? 0;\n    }\n    if (perk.yieldRate) rent += Math.round(priceOf(id) * perk.yieldRate);\n  }\n  if (rent > 0) {\n    out.naira += rent;\n    out.log.push(`Age ${age}: Your property and equipment earned ₦${rent.toLocaleString()}.`);\n  }\n\n  out.health = Math.min(PERK_CAPS.health, out.health);\n  out.smarts = Math.min(PERK_CAPS.smarts, out.smarts);\n  out.happiness = Math.min(PERK_CAPS.happiness, out.happiness);\n  return out;\n}\n\n// Human-readable perks for the inventory screen.\nexport function describeItemPerks(item: ShopItem): string[] {\n  const lines: string[] = [];\n  const line = lineOf(item.id);\n  const perk = ITEM_PERKS[line];\n  if (perk?.health) lines.push(`+${perk.health} health a year`);\n  if (perk?.smarts) lines.push(`+${perk.smarts} smarts a year`);\n  if (perk?.happiness) lines.push(`+${perk.happiness} happiness a year`);\n  if (perk?.yieldRate) lines.push(`Earns about ₦${Math.round(item.price * perk.yieldRate).toLocaleString()} a year`);\n  for (const group of Object.keys(GROUP_LINES) as OwnedGroup[]) {\n    if (GROUP_LINES[group].includes(line)) lines.push(GROUP_PERK_TEXT[group]);\n  }\n  return lines;\n}\n",
  "src/content/eventRules.ts": "import type { AssetId, LifeEvent } from \"./lifeEvents\";\nimport { owns, type OwnedGroup } from \"./ownership\";\nimport type { FaithId, JobId, LifeCharacter } from \"../engine/lifeSim\";\n\n// Who an event is actually for. Events used to fire for everybody, so a\n// ₦100M character still argued over a ₦300 keke fare and a non-trader\n// still had \"your stall\" levied. Rules are kept here, keyed by event id,\n// rather than inside the long event list; an event with no rule is open to\n// everyone. Every key must match a real event id (tested).\nexport interface EventRule {\n  minNaira?: number;\n  maxNaira?: number;\n  faiths?: FaithId[];\n  // Must currently hold one of these jobs.\n  jobs?: JobId[];\n  // Must have any job at all.\n  requiresJob?: boolean;\n  requiresAssets?: AssetId[];\n  excludesAssets?: AssetId[];\n  requiresOwned?: OwnedGroup[];\n  excludesOwned?: OwnedGroup[];\n  unmarried?: boolean;\n}\n\n// The \"everyday struggle\" threshold, in line with the chores' maxNaira values.\nconst STRUGGLE = 2_000_000;\n\nexport const EVENT_RULES: Record<string, EventRule> = {\n  // Transport struggles: gone once you're comfortable or own a car.\n  \"danfo-dispute\": { maxNaira: STRUGGLE, excludesOwned: [\"car\"] },\n  \"keke-dispute\": { maxNaira: STRUGGLE, excludesOwned: [\"car\"] },\n  \"danfo-breakdown\": { maxNaira: STRUGGLE, excludesOwned: [\"car\"] },\n  \"okada-ban\": { maxNaira: STRUGGLE, excludesOwned: [\"car\"] },\n  \"go-slow\": { maxNaira: 5_000_000, excludesOwned: [\"car\"] },\n  pickpocket: { maxNaira: 3_000_000, excludesOwned: [\"car\"] },\n  \"police-checkpoint\": { maxNaira: 3_000_000 },\n  // You can only be robbed in your car if you have one.\n  \"armed-robbery\": { requiresOwned: [\"car\"] },\n  // Housing.\n  \"landlord-rent\": { excludesOwned: [\"home\"] },\n  \"apartment-hunting-fees\": { excludesOwned: [\"home\"] },\n  // Work.\n  \"market-levy\": { jobs: [\"trader\", \"hawker\"] },\n  \"promotion-chance\": { requiresJob: true },\n  \"salary-delay\": { requiresJob: true },\n  // Faith.\n  \"church-harvest\": { faiths: [\"christian\"] },\n  \"mosque-giving\": { faiths: [\"muslim\"] },\n  \"ramadan-fast\": { faiths: [\"muslim\"] },\n  \"christmas-village-trip\": { faiths: [\"christian\"] },\n  \"new-yam-festival\": { faiths: [\"traditional\"] },\n  \"faith-questions\": { faiths: [\"atheist\", \"other\"] },\n  // Don't re-offer what you already own.\n  \"generator-opportunity\": { excludesAssets: [\"generator\"] },\n  \"borehole-opportunity\": { excludesAssets: [\"borehole\"] },\n  \"pos-hustle\": { excludesAssets: [\"pos-business\"] },\n  // Only for people who've actually got the thing.\n  \"pos-float-shortage\": { requiresAssets: [\"pos-business\"] },\n  \"pos-reversal-dispute\": { requiresAssets: [\"pos-business\"] },\n  \"logistics-truck-breakdown\": { requiresAssets: [\"logistics-business\"] },\n  // Wealth. Thresholds are on current naira, not birth tier, so a fortune\n  // won (or lost) mid-life changes what the city throws at you.\n  \"business-partnership\": { minNaira: 3_000_000, excludesAssets: [\"logistics-business\"] },\n  \"tax-audit\": { minNaira: 5_000_000 },\n  \"kidnap-scare\": { minNaira: 8_000_000 },\n  \"charity-gala\": { minNaira: 4_000_000 },\n  \"staff-fraud\": { minNaira: 2_000_000 },\n  \"island-party\": { minNaira: 10_000_000 },\n  // A wedding only happens to someone who isn't already married.\n  \"wedding-costs\": { unmarried: true },\n};\n\nexport function isEventAllowed(character: LifeCharacter, event: Pick<LifeEvent, \"id\">): boolean {\n  const rule = EVENT_RULES[event.id];\n  if (!rule) return true;\n  const naira = character.stats.naira;\n  if (rule.minNaira != null && naira < rule.minNaira) return false;\n  if (rule.maxNaira != null && naira > rule.maxNaira) return false;\n  if (rule.faiths && !rule.faiths.includes(character.faith)) return false;\n  if (rule.jobs && !rule.jobs.includes(character.job)) return false;\n  if (rule.requiresJob && character.job === \"none\") return false;\n  const assets = character.assets ?? [];\n  if (rule.requiresAssets && !rule.requiresAssets.every((a) => assets.includes(a))) return false;\n  if (rule.excludesAssets && rule.excludesAssets.some((a) => assets.includes(a))) return false;\n  if (rule.requiresOwned && !rule.requiresOwned.every((g) => owns(character, g))) return false;\n  if (rule.excludesOwned && rule.excludesOwned.some((g) => owns(character, g))) return false;\n  if (rule.unmarried && character.spouseUid) return false;\n  return true;\n}\n",
  "src/ui/Inventory.tsx": "import { SHOP_ITEMS, type ShopItem } from \"../content/shop\";\nimport { ASSET_INCOME, ASSET_LABELS, describeItemPerks } from \"../content/ownership\";\nimport { SELL_RATE, type LifeCharacter } from \"../engine/lifeSim\";\n\ninterface Props {\n  character: LifeCharacter;\n  onSell: (item: ShopItem) => void;\n}\n\n// \"My stuff\": everything bought in the shop plus durable assets, with what\n// each one does for you and a Sell button (see sellItem in lifeSim.ts).\nexport function Inventory({ character, onSell }: Props) {\n  const owned = character.inventory\n    .map((id) => SHOP_ITEMS.find((i) => i.id === id))\n    .filter((i): i is ShopItem => !!i);\n\n  return (\n    <div className=\"lifesim-shop\">\n      {character.assets.map((asset) => {\n        const income = ASSET_INCOME[asset];\n        return (\n          <div key={asset} className=\"lifesim-shop__item\">\n            <div className=\"lifesim-shop__info\">\n              <span className=\"lifesim-shop__name\">Your {ASSET_LABELS[asset]}</span>\n              <span className=\"lifesim-shop__desc\">\n                {income ? `Brings in ₦${income.toLocaleString()} a year.` : \"Keeps life in Lagos bearable.\"}\n              </span>\n            </div>\n          </div>\n        );\n      })}\n      {owned.length === 0 && character.assets.length === 0 && (\n        <p className=\"lifesim-hint\">You don't own anything yet — the Browse tab has something for every budget.</p>\n      )}\n      {owned.map((item) => {\n        const perks = describeItemPerks(item);\n        const refund = Math.floor(item.price * SELL_RATE);\n        return (\n          <div key={item.id} className=\"lifesim-shop__item\">\n            <div className=\"lifesim-shop__info\">\n              <span className=\"lifesim-shop__name\">{item.name}</span>\n              {perks.map((p) => (\n                <span key={p} className=\"lifesim-shop__desc\">\n                  {p}\n                </span>\n              ))}\n            </div>\n            <button className=\"rpg-choice-pill lifesim-shop__buy\" onClick={() => onSell(item)}>\n              {`Sell ₦${refund.toLocaleString()}`}\n            </button>\n          </div>\n        );\n      })}\n      {owned.length > 0 && (\n        <p className=\"lifesim-hint\">\n          Selling returns {Math.round(SELL_RATE * 100)}% of the price, and you can't buy that item back.\n        </p>\n      )}\n    </div>\n  );\n}\n",
  "tests/systems.test.ts": "import { describe, expect, it } from \"vitest\";\nimport {\n  AGE_UP_REQUIREMENTS,\n  MAX_HUSTLES_PER_YEAR,\n  SELL_RATE,\n  ageUp,\n  availableJobs,\n  buyItem,\n  hustle,\n  pickEvents,\n  resolveChore,\n  sellItem,\n  type LifeCharacter,\n} from \"../src/engine/lifeSim\";\nimport {\n  birthdayEffects,\n  hustleMultiplier,\n  moodHealthDrift,\n  payMultiplier,\n  zodiacFor,\n} from \"../src/engine/modifiers\";\nimport { CHORES, pickChores } from \"../src/content/chores\";\nimport { EVENT_RULES } from \"../src/content/eventRules\";\nimport { LIFE_EVENTS } from \"../src/content/lifeEvents\";\nimport { SHOP_ITEMS } from \"../src/content/shop\";\n\nfunction baseCharacter(overrides: Partial<LifeCharacter> = {}): LifeCharacter {\n  return {\n    name: \"Test\",\n    age: 30,\n    job: \"none\",\n    stats: { happiness: 50, health: 80, smarts: 50, looks: 50, naira: 10 },\n    alive: true,\n    deathCause: null,\n    lifespan: 90,\n    log: [],\n    seenEventIds: [],\n    streak: 0,\n    assets: [],\n    inventory: [],\n    skills: {},\n    earnedThisYear: 0,\n    spentThisYear: 0,\n    hustlesThisYear: 0,\n    blockedUids: [],\n    birthDate: \"2000-01-01\",\n    faith: \"christian\",\n    wealthTier: \"middle-class\",\n    inheritance: 0,\n    prayersThisYear: 0,\n    choreSkills: { labor: 0, errands: 0, finance: 0 },\n    sentTransfers: [],\n    schoolId: null,\n    ateThisYear: false,\n    classroomTalksThisYear: 0,\n    pensionSavings: 0,\n    choreGameHistory: {},\n    ...overrides,\n  };\n}\n\nconst withNaira = (naira: number) => ({ happiness: 50, health: 80, smarts: 50, looks: 50, naira });\nconst eventIds = (c: LifeCharacter) => pickEvents(c, 999).map((e) => e.id);\nconst shop = (id: string) => SHOP_ITEMS.find((i) => i.id === id)!;\n\ndescribe(\"smarts, looks and happiness now matter\", () => {\n  it(\"smarts scale job pay\", () => {\n    const smart = ageUp(baseCharacter({ job: \"hawker\", stats: { ...withNaira(0), smarts: 100 } }));\n    const dim = ageUp(baseCharacter({ job: \"hawker\", stats: { ...withNaira(0), smarts: 0 } }));\n    expect(smart.earnedThisYear).toBe(420_000);\n    expect(dim.earnedThisYear).toBe(280_000);\n    expect(payMultiplier(baseCharacter())).toBe(1);\n  });\n\n  it(\"smarts gate the better jobs\", () => {\n    const skills = { tech: 50 };\n    const dim = baseCharacter({ skills, stats: { ...withNaira(0), smarts: 10 } });\n    const bright = baseCharacter({ skills, stats: { ...withNaira(0), smarts: 40 } });\n    expect(availableJobs(dim).some((j) => j.id === \"tech\")).toBe(false);\n    expect(availableJobs(bright).some((j) => j.id === \"tech\")).toBe(true);\n  });\n\n  it(\"looks scale hustle pay, and even looks 0 still guarantees the adult earn requirement\", () => {\n    expect(hustleMultiplier(baseCharacter())).toBe(1);\n    const hardest = Math.max(...Object.values(AGE_UP_REQUIREMENTS).map((r) => r.minEarn));\n    for (let trial = 0; trial < 50; trial++) {\n      let c = baseCharacter({ stats: { ...withNaira(0), looks: 0 } });\n      for (let i = 0; i < MAX_HUSTLES_PER_YEAR; i++) c = hustle(c);\n      expect(c.earnedThisYear).toBeGreaterThanOrEqual(hardest);\n    }\n  });\n\n  it(\"happiness at rock bottom costs health each year; a happy life protects it\", () => {\n    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 0 } })).toBe(-3);\n    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 10 } })).toBe(-1);\n    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 50 } })).toBe(0);\n    expect(moodHealthDrift({ stats: { ...withNaira(0), happiness: 90 } })).toBe(1);\n    const sad = ageUp(baseCharacter({ stats: { ...withNaira(0), happiness: 0 } }));\n    expect(sad.stats.health).toBeLessThanOrEqual(78);\n    const happy = ageUp(baseCharacter({ stats: { ...withNaira(0), happiness: 100 } }));\n    expect(happy.stats.health).toBeGreaterThanOrEqual(79);\n  });\n});\n\ndescribe(\"assets and owned items pay off\", () => {\n  it(\"a POS business earns income each year\", () => {\n    const next = ageUp(baseCharacter({ assets: [\"pos-business\"] }));\n    expect(next.earnedThisYear).toBe(45_000);\n    expect(next.stats.naira).toBe(10 + 45_000);\n  });\n\n  it(\"a rentable property yields a share of its price each year\", () => {\n    const item = shop(\"shop-space-2\");\n    const next = ageUp(baseCharacter({ inventory: [item.id] }));\n    expect(next.earnedThisYear).toBe(Math.round(item.price * 0.05));\n  });\n\n  it(\"durable items give yearly stat perks\", () => {\n    const next = ageUp(baseCharacter({ inventory: [\"mattress-2\"] }));\n    expect(next.stats.health).toBeGreaterThanOrEqual(80 - 2 + 1);\n  });\n\n  it(\"selling refunds part of the price, doesn't count as earnings, and blocks rebuying\", () => {\n    const item = shop(\"sedan-car-2\");\n    const c = baseCharacter({ inventory: [item.id], stats: withNaira(0) });\n    const sold = sellItem(c, item);\n    expect(sold.stats.naira).toBe(Math.floor(item.price * SELL_RATE));\n    expect(sold.inventory).not.toContain(item.id);\n    expect(sold.earnedThisYear).toBe(0);\n    const rich = { ...sold, stats: withNaira(item.price * 2) };\n    expect(buyItem(rich, item)).toBe(rich);\n    expect(sellItem(sold, item)).toBe(sold);\n  });\n});\n\ndescribe(\"ownership removes the struggles it solves\", () => {\n  it(\"car owners never get commute chores\", () => {\n    const owner = baseCharacter({ inventory: [\"sedan-car-2\"] });\n    for (let i = 0; i < 40; i++) {\n      const ids = pickChores(owner, 30).map((c) => c.id);\n      expect(ids).not.toContain(\"commute\");\n      expect(ids).not.toContain(\"keke-squeeze\");\n      expect(ids).not.toContain(\"brt-queue\");\n    }\n    let seen = false;\n    for (let i = 0; i < 60 && !seen; i++) seen = pickChores(baseCharacter(), 30).some((c) => c.id === \"commute\");\n    expect(seen).toBe(true);\n  });\n\n  it(\"car owners skip transport struggles but can be robbed in the car\", () => {\n    const owner = eventIds(baseCharacter({ inventory: [\"sedan-car-2\"] }));\n    const walker = eventIds(baseCharacter());\n    for (const id of [\"danfo-dispute\", \"keke-dispute\", \"danfo-breakdown\", \"okada-ban\"]) {\n      expect(owner).not.toContain(id);\n      expect(walker).toContain(id);\n    }\n    expect(owner).toContain(\"armed-robbery\");\n    expect(walker).not.toContain(\"armed-robbery\");\n  });\n\n  it(\"homeowners never face rent hikes or agent fees\", () => {\n    const owner = eventIds(baseCharacter({ inventory: [\"duplex-2\"] }));\n    expect(owner).not.toContain(\"landlord-rent\");\n    expect(owner).not.toContain(\"apartment-hunting-fees\");\n    expect(eventIds(baseCharacter())).toContain(\"landlord-rent\");\n  });\n});\n\ndescribe(\"wealth, faith, job and asset filters on events\", () => {\n  const richOnly = [\"business-partnership\", \"tax-audit\", \"kidnap-scare\", \"charity-gala\", \"staff-fraud\", \"island-party\"];\n\n  it(\"a very rich character skips everyday struggles and gets rich-only events\", () => {\n    const ids = eventIds(baseCharacter({ stats: withNaira(50_000_000) }));\n    for (const id of [\"danfo-dispute\", \"keke-dispute\", \"danfo-breakdown\", \"okada-ban\", \"go-slow\"]) {\n      expect(ids).not.toContain(id);\n    }\n    for (const id of richOnly) expect(ids).toContain(id);\n  });\n\n  it(\"a poor character never gets rich-only events\", () => {\n    const ids = eventIds(baseCharacter({ stats: withNaira(1_000) }));\n    for (const id of richOnly) expect(ids).not.toContain(id);\n  });\n\n  it(\"faith events only fire for the matching faith\", () => {\n    const muslim = eventIds(baseCharacter({ faith: \"muslim\" }));\n    expect(muslim).toContain(\"mosque-giving\");\n    expect(muslim).toContain(\"ramadan-fast\");\n    expect(muslim).not.toContain(\"church-harvest\");\n    const christian = eventIds(baseCharacter({ faith: \"christian\" }));\n    expect(christian).toContain(\"church-harvest\");\n    expect(christian).toContain(\"christmas-village-trip\");\n    expect(christian).not.toContain(\"mosque-giving\");\n    expect(eventIds(baseCharacter({ faith: \"traditional\" }))).toContain(\"new-yam-festival\");\n    const atheist = eventIds(baseCharacter({ faith: \"atheist\" }));\n    expect(atheist).toContain(\"faith-questions\");\n    expect(atheist).not.toContain(\"church-harvest\");\n    expect(atheist).not.toContain(\"mosque-giving\");\n  });\n\n  it(\"job-specific events need the job\", () => {\n    const jobless = eventIds(baseCharacter({ job: \"none\" }));\n    for (const id of [\"market-levy\", \"promotion-chance\", \"salary-delay\"]) expect(jobless).not.toContain(id);\n    const trader = eventIds(baseCharacter({ job: \"trader\" }));\n    for (const id of [\"market-levy\", \"promotion-chance\", \"salary-delay\"]) expect(trader).toContain(id);\n    expect(eventIds(baseCharacter({ job: \"tech\" }))).not.toContain(\"market-levy\");\n  });\n\n  it(\"asset events need the asset, and owned assets aren't offered again\", () => {\n    const pos = eventIds(baseCharacter({ assets: [\"pos-business\"] }));\n    expect(pos).toContain(\"pos-float-shortage\");\n    expect(pos).not.toContain(\"pos-hustle\");\n    const none = eventIds(baseCharacter());\n    expect(none).not.toContain(\"pos-float-shortage\");\n    expect(none).toContain(\"pos-hustle\");\n    expect(eventIds(baseCharacter({ assets: [\"generator\"] }))).not.toContain(\"generator-opportunity\");\n    expect(eventIds(baseCharacter({ assets: [\"borehole\"] }))).not.toContain(\"borehole-opportunity\");\n  });\n\n  it(\"a married character doesn't get the wedding event\", () => {\n    expect(eventIds(baseCharacter())).toContain(\"wedding-costs\");\n    expect(eventIds(baseCharacter({ spouseUid: \"x\", spouseName: \"Y\" }))).not.toContain(\"wedding-costs\");\n  });\n\n  it(\"every rule points at a real event, and a broke jobless adult still has plenty of events\", () => {\n    const real = new Set(LIFE_EVENTS.map((e) => e.id));\n    for (const id of Object.keys(EVENT_RULES)) expect(real.has(id)).toBe(true);\n    const bare = eventIds(baseCharacter({ faith: \"other\" }));\n    expect(bare.length).toBeGreaterThanOrEqual(10);\n  });\n});\n\ndescribe(\"streaks, chore skills and birthdays\", () => {\n  it(\"every 5th healthy year pays a bonus\", () => {\n    const next = ageUp(baseCharacter({ streak: 4 }));\n    expect(next.streak).toBe(5);\n    expect(next.log.some((l) => l.includes(\"5-year\"))).toBe(true);\n    expect(next.stats.happiness).toBeGreaterThanOrEqual(53);\n  });\n\n  it(\"labor skill removes the health cost of chores\", () => {\n    const chore = CHORES.find((c) => c.id === \"fetch-water\")!;\n    const trained = resolveChore(baseCharacter({ choreSkills: { labor: 30, errands: 0, finance: 0 } }), chore, true);\n    const untrained = resolveChore(baseCharacter(), chore, true);\n    expect(trained.stats.health).toBe(80);\n    expect(untrained.stats.health).toBe(79);\n  });\n\n  it(\"errands skill removes the happiness cost of chores\", () => {\n    const chore = CHORES.find((c) => c.id === \"call-landlord\")!;\n    const trained = resolveChore(baseCharacter({ choreSkills: { labor: 0, errands: 30, finance: 0 } }), chore, true);\n    expect(trained.stats.happiness).toBe(50);\n    expect(resolveChore(baseCharacter(), chore, true).stats.happiness).toBe(49);\n  });\n\n  it(\"finance skill discounts chore costs\", () => {\n    const chore = CHORES.find((c) => c.id === \"market-run\")!;\n    const rich = baseCharacter({ stats: withNaira(5000), choreSkills: { labor: 0, errands: 0, finance: 100 } });\n    expect(resolveChore(rich, chore, true).stats.naira).toBe(4000);\n  });\n\n  it(\"zodiac comes from the birth date\", () => {\n    expect(zodiacFor(\"2000-01-01\")).toBe(\"Capricorn\");\n    expect(zodiacFor(\"2000-03-21\")).toBe(\"Aries\");\n    expect(zodiacFor(\"2000-08-23\")).toBe(\"Virgo\");\n    expect(zodiacFor(\"2000-12-22\")).toBe(\"Capricorn\");\n    expect(zodiacFor(\"\")).toBeNull();\n    expect(zodiacFor(\"not a date\")).toBeNull();\n  });\n\n  it(\"milestone birthdays are logged, others are silent\", () => {\n    expect(birthdayEffects(\"2000-08-23\", 21).log[0]).toContain(\"Virgo\");\n    expect(birthdayEffects(\"2000-08-23\", 22).log).toEqual([]);\n    const next = ageUp(baseCharacter({ age: 17 }));\n    expect(next.log.some((l) => l.includes(\"Birthday\"))).toBe(true);\n  });\n});\n"
 },
 "newEvents": "  {\n    id: \"business-partnership\",\n    bands: [\"adult\"],\n    prompt: \"A well-connected acquaintance offers you a stake in a small logistics business — ₦2,000,000 for a share of a delivery fleet.\",\n    choices: [\n      {\n        label: \"Invest\",\n        result: \"Slow at first, then the delivery contracts start paying out.\",\n        delta: { naira: -2000000, happiness: 2, smarts: 1 },\n        requiresNaira: 2000000,\n        grantsAsset: \"logistics-business\",\n      },\n      {\n        label: \"Politely decline\",\n        result: \"You watch him sign someone else up by the end of the week.\",\n        delta: { happiness: -1 },\n      },\n    ],\n  },\n  {\n    id: \"tax-audit\",\n    bands: [\"adult\"],\n    prompt: \"A tax officer shows up with a letter about three years of your returns.\",\n    choices: [\n      {\n        label: \"Pay a tax consultant to handle it\",\n        result: \"Expensive, but the letter goes away.\",\n        delta: { naira: -400000, happiness: -1 },\n        requiresNaira: 400000,\n      },\n      {\n        label: \"Handle it yourself\",\n        result: \"Weeks of paperwork and bad coffee, but you learn more about tax than you wanted to.\",\n        delta: { health: -2, happiness: -3, smarts: 2 },\n      },\n    ],\n  },\n  {\n    id: \"kidnap-scare\",\n    bands: [\"adult\"],\n    prompt: \"A man in your circle was kidnapped for ransom last week. Your driver suggests varying your routes.\",\n    choices: [\n      {\n        label: \"Hire private security\",\n        result: \"Two quiet men in the car and your mind at ease.\",\n        delta: { naira: -1500000, happiness: 1 },\n        requiresNaira: 1500000,\n      },\n      {\n        label: \"Carry on as usual\",\n        result: \"Nothing happens, but you check the mirror more than you used to.\",\n        delta: { happiness: -3 },\n        risk: {\n          chance: 0.08,\n          fatalShare: 0.25,\n          maimDelta: { health: -40, happiness: -15 },\n          maimResult: \"Armed men box in your car one evening. You survive, but not unharmed.\",\n          deathResult: \"Armed men box in your car one evening. You are not seen again.\",\n        },\n      },\n    ],\n  },\n  {\n    id: \"charity-gala\",\n    bands: [\"adult\"],\n    prompt: \"You're invited to a charity gala where everyone knows exactly how much everyone else gives.\",\n    choices: [\n      {\n        label: \"Give big and be seen giving\",\n        result: \"Cameras flash. The cause genuinely benefits.\",\n        delta: { naira: -750000, happiness: 4 },\n        requiresNaira: 750000,\n      },\n      {\n        label: \"Give quietly\",\n        result: \"No photos, no pressure, but a few raised eyebrows.\",\n        delta: { naira: -50000, happiness: 1 },\n      },\n    ],\n  },\n  {\n    id: \"staff-fraud\",\n    bands: [\"adult\"],\n    prompt: \"Your driver has been padding the fuel receipts for months.\",\n    choices: [\n      {\n        label: \"Confront him and settle it quietly\",\n        result: \"He promises to do better. You keep an eye on the receipts.\",\n        delta: { happiness: -1 },\n      },\n      {\n        label: \"Sack him and hire someone new\",\n        result: \"Agency fees and a week of chaos, but the receipts add up now.\",\n        delta: { naira: -80000, happiness: -2 },\n      },\n    ],\n  },\n  {\n    id: \"island-party\",\n    bands: [\"adult\"],\n    prompt: \"A yacht party on the lagoon this weekend — guest list by invitation only.\",\n    choices: [\n      {\n        label: \"Attend\",\n        result: \"Music, skyline, and more small talk than you can count.\",\n        delta: { naira: -250000, happiness: 5, looks: 1 },\n      },\n      {\n        label: \"Decline politely\",\n        result: \"You stay in and sleep early, a little curious about what you missed.\",\n        delta: { happiness: -1 },\n      },\n    ],\n  },\n  {\n    id: \"ramadan-fast\",\n    bands: [\"adult\", \"teen\"],\n    prompt: \"Ramadan begins, and the days are long in the Lagos heat.\",\n    choices: [\n      {\n        label: \"Keep the full fast\",\n        result: \"Hungry and tired, but the evenings with family feel richer for it.\",\n        delta: { health: -2, happiness: 3 },\n      },\n      {\n        label: \"Fast on the days you can\",\n        result: \"You do what your body allows and make peace with the rest.\",\n        delta: { happiness: 1 },\n      },\n    ],\n  },\n  {\n    id: \"christmas-village-trip\",\n    bands: [\"adult\", \"teen\"],\n    prompt: \"December arrives, and the whole family is travelling to the village for Christmas.\",\n    choices: [\n      {\n        label: \"Make the trip\",\n        result: \"Hours on the road, but the jollof and the noise are worth every minute.\",\n        delta: { naira: -35000, happiness: 4, health: -1 },\n        requiresNaira: 35000,\n      },\n      {\n        label: \"Stay in Lagos this year\",\n        result: \"Quiet streets and a pang of missing out.\",\n        delta: { happiness: -2 },\n      },\n    ],\n  },\n  {\n    id: \"new-yam-festival\",\n    bands: [\"adult\", \"teen\"],\n    prompt: \"The new yam festival is back in your family's hometown, and the elders expect you to bring something for the feast.\",\n    choices: [\n      {\n        label: \"Bring yams and palm wine\",\n        result: \"The elders nod approval, and you eat until you can't move.\",\n        delta: { naira: -12000, happiness: 3 },\n        requiresNaira: 12000,\n      },\n      {\n        label: \"Send a message and some money instead\",\n        result: \"It's noted that you weren't there.\",\n        delta: { naira: -5000, happiness: -1 },\n      },\n    ],\n  },\n  {\n    id: \"faith-questions\",\n    bands: [\"adult\"],\n    prompt: \"At a family gathering, an aunty asks pointedly why she never sees you at any place of worship.\",\n    choices: [\n      {\n        label: \"Smile and change the subject\",\n        result: \"She lets it go — for now.\",\n        delta: { happiness: -1 },\n      },\n      {\n        label: \"Explain what you believe, calmly\",\n        result: \"A few raised eyebrows, one surprisingly good conversation.\",\n        delta: { happiness: 1, smarts: 1 },\n      },\n    ],\n  },\n  {\n    id: \"pos-float-shortage\",\n    bands: [\"adult\"],\n    prompt: \"A network failure leaves your POS float short after a long queue of customers.\",\n    choices: [\n      {\n        label: \"Top up the float from your own savings\",\n        result: \"Costly, but your regulars stay regulars.\",\n        delta: { naira: -30000, happiness: -1 },\n        requiresNaira: 30000,\n      },\n      {\n        label: \"Close early and apologize\",\n        result: \"Some customers grumble and walk to the next stand.\",\n        delta: { happiness: -2 },\n      },\n    ],\n  },\n  {\n    id: \"pos-reversal-dispute\",\n    bands: [\"adult\"],\n    prompt: \"A customer claims a transfer failed and demands a refund — the bank's records say otherwise.\",\n    choices: [\n      {\n        label: \"Refund him to keep the peace\",\n        result: \"Fifteen thousand lighter, and he never says thank you.\",\n        delta: { naira: -15000, happiness: -1 },\n      },\n      {\n        label: \"Show the receipt and hold your ground\",\n        result: \"A loud argument, a crowd, and eventually an apology you didn't need.\",\n        delta: { happiness: -2, health: -1 },\n      },\n    ],\n  },\n  {\n    id: \"logistics-truck-breakdown\",\n    bands: [\"adult\"],\n    prompt: \"One of your delivery trucks breaks down mid-route with a client's goods on board.\",\n    choices: [\n      {\n        label: \"Pay for emergency repairs\",\n        result: \"The truck is back on the road by evening, and the client never knows.\",\n        delta: { naira: -120000, happiness: -1 },\n        requiresNaira: 120000,\n      },\n      {\n        label: \"Hire another truck for the day\",\n        result: \"The delivery makes it, with a long phone call of apologies.\",\n        delta: { naira: -40000, happiness: -1 },\n      },\n    ],\n  },",
 "eventsFile": "src/content/lifeEvents.ts",
 "requires": {
  "file": "src/engine/lifeSim.ts",
  "text": "rollYearWork"
 }
};

const files = {};
const eol = {};
function load(path) {
  if (files[path] !== undefined) return;
  if (!existsSync(path)) {
    console.error(`Can't find ${path} — run this from the repo root (the folder with package.json).`);
    process.exit(1);
  }
  const raw = readFileSync(path, "utf8");
  eol[path] = raw.includes("\r\n") ? "\r\n" : "\n";
  files[path] = raw.replace(/\r\n/g, "\n");
}

load(DATA.requires.file);
if (!files[DATA.requires.file].includes(DATA.requires.text)) {
  console.error("Apply the childhood fix first (node apply-childhood-fix.mjs) — this patch builds on it.");
  process.exit(1);
}
if (existsSync("src/content/ownership.ts")) {
  console.log("Looks like this patch is already applied (src/content/ownership.ts exists). Nothing to do.");
  process.exit(0);
}
for (const p of Object.keys(DATA.newFiles)) {
  if (existsSync(p)) {
    console.error(`${p} already exists — refusing to overwrite it. Move it aside and run again.`);
    process.exit(1);
  }
}

function count(src, find) {
  let n = 0;
  let i = src.indexOf(find);
  while (i !== -1) {
    n++;
    i = src.indexOf(find, i + find.length);
  }
  return n;
}

try {
  for (const e of DATA.edits) {
    load(e.file);
    const src = files[e.file];
    if (e.kind === "replace") {
      const n = count(src, e.find);
      if (n !== e.count) {
        throw new Error(`${e.file}: expected ${e.count} match(es) but found ${n} for:\n${e.find}`);
      }
      files[e.file] = src.split(e.find).join(e.replace);
    } else {
      const s = src.indexOf(e.start);
      if (s === -1) throw new Error(`${e.file}: couldn't find start marker:\n${e.start}`);
      const t = src.indexOf(e.end, s);
      if (t === -1) throw new Error(`${e.file}: couldn't find end marker:\n${e.end}`);
      files[e.file] = src.slice(0, s) + e.replace + src.slice(t + e.end.length);
    }
  }

  load(DATA.eventsFile);
  const ev = files[DATA.eventsFile];
  for (const id of DATA.newEvents.match(/id: "[^"]+"/g) ?? []) {
    if (ev.includes(id)) throw new Error(`${DATA.eventsFile}: event ${id} already exists`);
  }
  const close = ev.lastIndexOf("\n];");
  if (close === -1) throw new Error(`${DATA.eventsFile}: couldn't find the closing "];" of LIFE_EVENTS`);
  files[DATA.eventsFile] = ev.slice(0, close) + "\n" + DATA.newEvents + ev.slice(close);
} catch (err) {
  console.error("\nPATCH NOT APPLIED — no files were changed.\n");
  console.error(err.message);
  console.error("\nIf the file was edited since this patch was written, send the error above back to Claude.");
  process.exit(1);
}

for (const [path, text] of Object.entries(DATA.newFiles)) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
for (const [path, text] of Object.entries(files)) {
  writeFileSync(path, eol[path] === "\r\n" ? text.replace(/\n/g, "\r\n") : text);
}

console.log("Patch applied:");
for (const p of Object.keys(files)) console.log(`  edited  ${p}`);
for (const p of Object.keys(DATA.newFiles)) console.log(`  added   ${p}`);
console.log("\nNext: npm test && npm run build");
EOF
node apply-systems-fix.mjs
