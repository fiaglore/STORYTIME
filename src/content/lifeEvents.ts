// Random life events for Lagos Life mode. Each event belongs to one or more
// age bands and offers 2-3 choices, each with stat deltas and a result line.
// Themes echo the book's chapters (hustle, extortion, family pressure, the
// Naira-or-Spirit trade-off) without requiring the Ink engine — this is a
// separate, procedural game mode living alongside the scripted chapters.

export type AgeBand = "infant" | "child" | "teen" | "adult";

export interface StatDelta {
  happiness?: number;
  health?: number;
  smarts?: number;
  looks?: number;
  naira?: number;
}

export interface EventChoice {
  label: string;
  result: string;
  delta: StatDelta;
}

export interface LifeEvent {
  id: string;
  bands: AgeBand[];
  prompt: string;
  choices: EventChoice[];
}

export function bandForAge(age: number): AgeBand {
  if (age <= 2) return "infant";
  if (age <= 12) return "child";
  if (age <= 17) return "teen";
  return "adult";
}

export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: "nepa-homework",
    bands: ["child", "teen"],
    prompt: "NEPA takes the light right when you're trying to finish your homework by candlelight.",
    choices: [
      {
        label: "Beg to run the generator",
        result: "Papa grumbles about fuel money but switches it on.",
        delta: { naira: -2, happiness: 2 },
      },
      {
        label: "Just manage with a candle",
        result: "You squint through it. Your eyes hurt but the work gets done.",
        delta: { health: -1, smarts: 1 },
      },
    ],
  },
  {
    id: "found-money",
    bands: ["child", "teen"],
    prompt: "You find a crumpled ₦500 note on the ground outside the compound.",
    choices: [
      {
        label: "Keep it quietly",
        result: "Small small, na so money full ground.",
        delta: { naira: 3, happiness: 1 },
      },
      {
        label: "Ask around if someone dropped it",
        result: "Nobody claims it, but a neighbour blesses you for asking.",
        delta: { happiness: 2 },
      },
    ],
  },
  {
    id: "school-bully",
    bands: ["child"],
    prompt: "A bigger boy at school keeps collecting your lunch money.",
    choices: [
      {
        label: "Report to a teacher",
        result: "He gets punished. He glares at you for weeks after.",
        delta: { happiness: -1, smarts: 1 },
      },
      {
        label: "Stand up to him yourself",
        result: "You get a bruise, but he leaves you alone after that.",
        delta: { health: -3, happiness: 2 },
      },
      {
        label: "Just avoid him",
        result: "You take the long way round school every day now.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "exam-results",
    bands: ["child", "teen"],
    prompt: "Exam results are out and your position in class is posted on the board.",
    choices: [
      {
        label: "Study harder next term",
        result: "You trade some weekends for extra reading.",
        delta: { smarts: 3, happiness: -1 },
      },
      {
        label: "Celebrate — good enough for now",
        result: "Mama is satisfied. You enjoy the holiday.",
        delta: { happiness: 2 },
      },
    ],
  },
  {
    id: "jamb-prep",
    bands: ["teen"],
    prompt: "JAMB forms close in two weeks and the fee is ₦18,000 you don't have.",
    choices: [
      {
        label: "Take on weekend hawking to raise it",
        result: "Hot afternoons selling sachet water, but you make the deadline.",
        delta: { naira: -5, health: -2, smarts: 1 },
      },
      {
        label: "Ask family to help",
        result: "It costs you a favour you'll owe later, but the form is submitted.",
        delta: { happiness: -1, naira: 2 },
      },
    ],
  },
  {
    id: "cult-pressure",
    bands: ["teen"],
    prompt: "Some boys in your area who run with a campus cult offer you \"protection\" and quick money.",
    choices: [
      {
        label: "Refuse and keep your distance",
        result: "They mock you for a while, then move on to easier targets.",
        delta: { happiness: -1, naira: -1 },
      },
      {
        label: "Take the money just once",
        result: "The cash feels good. The debt they expect back does not.",
        delta: { naira: 6, happiness: -3, health: -1 },
      },
    ],
  },
  {
    id: "first-crush",
    bands: ["teen"],
    prompt: "Someone in your class finally notices you back.",
    choices: [
      {
        label: "Write them a note",
        result: "Your hands shake writing it. They smile reading it.",
        delta: { happiness: 3 },
      },
      {
        label: "Keep it to yourself",
        result: "Some things are safer unsaid, you tell yourself.",
        delta: { happiness: -1, smarts: 1 },
      },
    ],
  },
  {
    id: "danfo-dispute",
    bands: ["adult"],
    prompt: "The conductor insists the fare just went up and won't give your change.",
    choices: [
      {
        label: "Argue for your change",
        result: "The whole bus gets involved. You get it back, eventually.",
        delta: { naira: 1, happiness: -1 },
      },
      {
        label: "Let it go",
        result: "Not worth the stress today. You let the ₦50 go.",
        delta: { naira: -1, happiness: -1 },
      },
    ],
  },
  {
    id: "police-checkpoint",
    bands: ["adult"],
    prompt: "A checkpoint stops your bike. \"Oga, anything for the boys?\"",
    choices: [
      {
        label: "Pay the \"settlement\"",
        result: "Cheaper than the argument would have cost you.",
        delta: { naira: -3, happiness: -2 },
      },
      {
        label: "Refuse and ask for his ID number",
        result: "A tense minute passes. He waves you through, irritated.",
        delta: { happiness: 2, health: -1 },
      },
    ],
  },
  {
    id: "generator-bill",
    bands: ["adult"],
    prompt: "NEPA has taken light for four days straight. The generator is drinking fuel money.",
    choices: [
      {
        label: "Keep running the generator",
        result: "At least the fridge stays cold.",
        delta: { naira: -4, happiness: 1 },
      },
      {
        label: "Manage without it",
        result: "You sweat through the nights, but you save the naira.",
        delta: { naira: 2, health: -1, happiness: -1 },
      },
    ],
  },
  {
    id: "pos-hustle",
    bands: ["adult"],
    prompt: "A friend offers you a stake in a POS (point-of-sale) agent business on your street.",
    choices: [
      {
        label: "Invest what you've saved",
        result: "Risky, but the commissions start trickling in.",
        delta: { naira: 5, happiness: 2 },
      },
      {
        label: "Pass — too risky right now",
        result: "You watch the stand do steady business from a distance.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "family-request",
    bands: ["adult"],
    prompt: "A relative calls asking for help with a hospital bill.",
    choices: [
      {
        label: "Send what you can",
        result: "It's tight this month, but family is family.",
        delta: { naira: -6, happiness: 2 },
      },
      {
        label: "Explain you can't right now",
        result: "The silence on the phone says more than words would.",
        delta: { happiness: -3, naira: 1 },
      },
    ],
  },
  {
    id: "japa-temptation",
    bands: ["adult"],
    prompt: "A former classmate posts from abroad: \"This place changed my life. You should come too.\"",
    choices: [
      {
        label: "Start saving toward it",
        result: "The dream feels closer with every naira you set aside.",
        delta: { naira: -2, happiness: 3, smarts: 1 },
      },
      {
        label: "Decide Lagos is still home",
        result: "You scroll past, oddly at peace with staying.",
        delta: { happiness: 1 },
      },
    ],
  },
  {
    id: "go-slow",
    bands: ["adult"],
    prompt: "Third Mainland Bridge is pure go-slow today and you're already late for work.",
    choices: [
      {
        label: "Try an okada through the gaps",
        result: "Terrifying, but you make it on time, heart pounding.",
        delta: { happiness: 1, health: -2 },
      },
      {
        label: "Accept you'll be late",
        result: "You message your boss and sit with the traffic.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "church-harvest",
    bands: ["adult", "teen"],
    prompt: "It's harvest Sunday and the offering basket is making its rounds.",
    choices: [
      {
        label: "Give generously",
        result: "You feel lighter walking out, in more ways than one.",
        delta: { naira: -3, happiness: 3 },
      },
      {
        label: "Give what's comfortable",
        result: "Nobody's counting but you, and you're at peace with it.",
        delta: { happiness: 1 },
      },
    ],
  },
  {
    id: "akara-stall-trouble",
    bands: ["adult"],
    prompt: "You pass a food seller's stall being harassed by market touts demanding a \"levy.\" A small crowd is watching.",
    choices: [
      {
        label: "Stand with the crowd that's gathering",
        result: "The touts back off when enough people stop to watch. Small solidarity, big difference.",
        delta: { happiness: 3, health: -1 },
      },
      {
        label: "Keep walking — not your business",
        result: "You tell yourself you had your own problems today. It doesn't quite sit right.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "promotion-chance",
    bands: ["adult"],
    prompt: "Your boss hints there's a promotion coming, but says it depends on \"who shows loyalty.\"",
    choices: [
      {
        label: "Work extra hours to prove it",
        result: "You're exhausted, but the extra effort gets noticed.",
        delta: { naira: 3, health: -2, smarts: 1 },
      },
      {
        label: "Do your job well, nothing extra",
        result: "You keep your evenings. The promotion goes to someone else.",
        delta: { happiness: 1 },
      },
    ],
  },
  {
    id: "owambe-invite",
    bands: ["adult", "teen"],
    prompt: "You're invited to a big owambe party this weekend — new aso-ebi required.",
    choices: [
      {
        label: "Buy the aso-ebi and go all out",
        result: "You dance till your feet hurt. Worth every naira.",
        delta: { naira: -5, happiness: 4, looks: 1 },
      },
      {
        label: "Attend in something simple",
        result: "A few side-eyes, but you still have a good time.",
        delta: { happiness: 2, naira: -1 },
      },
    ],
  },
  {
    id: "landlord-rent",
    bands: ["adult"],
    prompt: "Your landlord raises the rent again, with no warning.",
    choices: [
      {
        label: "Negotiate hard",
        result: "He budges a little. It's something.",
        delta: { happiness: 1, naira: -2 },
      },
      {
        label: "Start quietly looking for a new place",
        result: "House-hunting in Lagos is its own full-time job.",
        delta: { naira: -1, happiness: -2 },
      },
    ],
  },
  {
    id: "sibling-school-fees",
    bands: ["adult"],
    prompt: "Your younger sibling's school fees are due and your parents are short.",
    choices: [
      {
        label: "Cover it yourself",
        result: "Your account is thinner, but your sibling stays in school.",
        delta: { naira: -7, happiness: 3 },
      },
      {
        label: "Contribute what you can, not all",
        result: "You split the difference, and so does the family's relief.",
        delta: { naira: -3, happiness: 1 },
      },
    ],
  },
  {
    id: "health-scare",
    bands: ["adult"],
    prompt: "You've been feeling run down for weeks and finally see a doctor.",
    choices: [
      {
        label: "Pay for proper tests",
        result: "Nothing serious, just exhaustion — but you catch it early.",
        delta: { naira: -4, health: 4 },
      },
      {
        label: "Just rest it off",
        result: "You feel a little better, but you're not sure what it was.",
        delta: { health: 1, happiness: -1 },
      },
    ],
  },
];
