// Character creation: faith selection and the "random important questions"
// that roll a starting wealth tier + inheritance (see CLAUDE.md and
// lifeSim.ts's rollWealthTier). Everybody still starts at the same base
// stats (createCharacter) — only the starting naira and its Lagos-slang
// tier label differ, and that's driven by this quiz plus some baked-in
// randomness, not a deterministic lookup. The quiz questions themselves
// are deliberately unrelated to wealth (birth day, lucky number, sleep
// habits, spirit animal, favorite color) — per the design ask, nothing
// about family background, school, or connections should be asked; the
// tier is just randomly assigned, dressed up as a bit of character flavor.

export type FaithId = "christian" | "muslim" | "traditional" | "atheist" | "other";

export const FAITHS: { id: FaithId; label: string }[] = [
  { id: "christian", label: "Christian" },
  { id: "muslim", label: "Muslim" },
  { id: "traditional", label: "Traditional / Orisha" },
  { id: "atheist", label: "Atheist / non-religious" },
  { id: "other", label: "Something else" },
];

export type WealthTierId =
  | "shepeteri"
  | "middle-class"
  | "rich"
  | "stinking-rich"
  | "stupendously-rich"
  | "famous";

export interface WealthTier {
  id: WealthTierId;
  label: string;
  minScore: number;
  inheritanceMin: number;
  inheritanceMax: number;
}

// Ordered low to high. Scores come from CREATION_QUESTIONS below plus a
// random nudge (see rollWealthTier in lifeSim.ts) — "assigned randomly from
// the information gathered at sign in" per the design ask, not a pure
// lookup table.
export const WEALTH_TIERS: WealthTier[] = [
  { id: "shepeteri", label: "Shepeteri", minScore: 0, inheritanceMin: 0, inheritanceMax: 50_000 },
  { id: "middle-class", label: "Middle Class", minScore: 4, inheritanceMin: 150_000, inheritanceMax: 1_500_000 },
  { id: "rich", label: "Rich", minScore: 9, inheritanceMin: 2_000_000, inheritanceMax: 7_000_000 },
  { id: "stinking-rich", label: "Stinking Rich", minScore: 14, inheritanceMin: 8_000_000, inheritanceMax: 20_000_000 },
  { id: "stupendously-rich", label: "Stupendously Rich", minScore: 18, inheritanceMin: 22_000_000, inheritanceMax: 55_000_000 },
  { id: "famous", label: "Famous", minScore: 22, inheritanceMin: 60_000_000, inheritanceMax: 180_000_000 },
];

export interface CreationQuestionOption {
  label: string;
  score: number;
}

export interface CreationQuestion {
  id: string;
  prompt: string;
  options: CreationQuestionOption[];
}

// Each answer scores 0-6; three are asked per character, picked at random
// from this pool so the questionnaire doesn't feel identical every time.
// None of these have anything to do with family background, money, or
// status — on purpose. The resulting wealth tier is meant to feel like a
// roll of the dice, not a reflection of who the player says they are.
export const CREATION_QUESTIONS: CreationQuestion[] = [
  {
    id: "birth-day",
    prompt: "What day of the week do people say you were born?",
    options: [
      { label: "Sunday", score: 0 },
      { label: "Tuesday", score: 2 },
      { label: "Thursday", score: 4 },
      { label: "Saturday", score: 6 },
    ],
  },
  {
    id: "lucky-number",
    prompt: "Pick a lucky number.",
    options: [
      { label: "3", score: 0 },
      { label: "7", score: 2 },
      { label: "9", score: 4 },
      { label: "13", score: 6 },
    ],
  },
  {
    id: "body-clock",
    prompt: "Morning person or night owl?",
    options: [
      { label: "Up with the sun", score: 0 },
      { label: "Somewhere in between", score: 2 },
      { label: "Night owl, always", score: 4 },
      { label: "I don't sleep, I nap", score: 6 },
    ],
  },
  {
    id: "spirit-animal",
    prompt: "Which animal do you feel most drawn to?",
    options: [
      { label: "Tortoise", score: 0 },
      { label: "Cat", score: 2 },
      { label: "Lion", score: 4 },
      { label: "Eagle", score: 6 },
    ],
  },
  {
    id: "favorite-color",
    prompt: "What's your favorite color?",
    options: [
      { label: "Green", score: 0 },
      { label: "Blue", score: 2 },
      { label: "Red", score: 4 },
      { label: "Gold", score: 6 },
    ],
  },
];

export function pickCreationQuestions(count = 3): CreationQuestion[] {
  const pool = [...CREATION_QUESTIONS];
  const picked: CreationQuestion[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}
