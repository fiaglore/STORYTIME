// Character creation: faith selection and the "random important questions"
// that roll a starting wealth tier + inheritance (see CLAUDE.md and
// lifeSim.ts's rollWealthTier). Everybody still starts at the same base
// stats (createCharacter) — only the starting naira and its Lagos-slang
// tier label differ, and that's driven by this quiz plus some baked-in
// randomness, not a deterministic lookup.

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
export const CREATION_QUESTIONS: CreationQuestion[] = [
  {
    id: "family-business",
    prompt: "What did your people do for a living back home?",
    options: [
      { label: "Nothing steady — hand to mouth", score: 0 },
      { label: "Hawking and petty trade", score: 2 },
      { label: "A shop in the market", score: 4 },
      { label: "Import/export business", score: 6 },
    ],
  },
  {
    id: "childhood-home",
    prompt: "What was home like growing up?",
    options: [
      { label: "One room, shared with cousins", score: 0 },
      { label: "A face-me-I-face-you compound", score: 2 },
      { label: "A proper bungalow, our own", score: 4 },
      { label: "A duplex with a generator that never had to run", score: 6 },
    ],
  },
  {
    id: "school",
    prompt: "Where did your parents manage to send you to school?",
    options: [
      { label: "Public school, when fees could be found", score: 0 },
      { label: "A decent private school", score: 2 },
      { label: "A well-known private school", score: 4 },
      { label: "Abroad, or Lagos's most expensive", score: 6 },
    ],
  },
  {
    id: "family-connections",
    prompt: "Does your family know anybody important?",
    options: [
      { label: "Nobody — we hustle for ourselves", score: 0 },
      { label: "A cousin in the civil service", score: 2 },
      { label: "A few useful contacts in business", score: 4 },
      { label: "People who get invited to the big parties", score: 6 },
    ],
  },
  {
    id: "transport",
    prompt: "How did your family get around?",
    options: [
      { label: "Trekking, or whatever danfo was going", score: 0 },
      { label: "Okada and keke, when in a hurry", score: 2 },
      { label: "A family car, usually working", score: 4 },
      { label: "A driver on standby", score: 6 },
    ],
  },
  {
    id: "big-dream",
    prompt: "What's the one thing you want out of this life?",
    options: [
      { label: "Just to survive and feed my own", score: 1 },
      { label: "A steady job and a roof that's mine", score: 2 },
      { label: "To build something people respect", score: 3 },
      { label: "To be known — everywhere, by everyone", score: 4 },
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
