// Trainable skills for Lagos Life. Distinct from the core stats (smarts
// etc.) — these gate which jobs are even available (see JOBS'
// requiresSkill in lifeSim.ts), not just flavor numbers. Train one via
// trainSkill() in lifeSim.ts, which costs SKILL_TRAIN_COST and a little
// health each time, for a random 5-15 point gain (0-100 scale, same as
// the core stats).
export interface Skill {
  id: string;
  name: string;
  description: string;
}

export const SKILLS: Skill[] = [
  { id: "driving", name: "Driving", description: "Behind the wheel, dodging go-slow like a pro." },
  { id: "tailoring", name: "Tailoring", description: "Needle, thread, and an eye for a clean fit." },
  { id: "cooking", name: "Cooking", description: "The kind of jollof people ask for the recipe." },
  { id: "tech", name: "Tech", description: "Code, gadgets, and knowing your way round a laptop." },
  { id: "trading", name: "Trading", description: "Buy low, sell high, haggle harder." },
  { id: "communication", name: "Communication", description: "Talking your way in — and sometimes out." },
];

export const SKILL_TRAIN_COST = 3000;
