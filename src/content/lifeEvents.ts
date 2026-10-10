// Random life events for Lagos Life mode. Each event belongs to one or more
// age bands and offers 2-3 choices, each with stat deltas and a result line.
// Themes echo the book's chapters (hustle, extortion, family pressure, the
// Naira-or-Spirit trade-off) without requiring the Ink engine — this is a
// separate, procedural game mode living alongside the scripted chapters.
//
// naira deltas are real Naira (not an abstract "k" unit), anchored to a
// fuel price of NGN1,400/litre — see the generator-bill event's math in
// particular. Job pay (lifeSim.ts's JOBS) is similarly realistic annual
// Lagos income, so affording the larger discretionary costs here (a
// generator, POS capital, full school fees) is meant to be genuinely hard,
// not a rounding error — that's the point, not a bug.

export type AgeBand = "infant" | "child" | "teen" | "adult";

// Durable goods a character can own, persisted on LifeCharacter.assets.
// Granted by resolving a choice with grantsAsset, checked by choices with
// requiresAsset (e.g. you can't choose to run a generator you don't own).
export type AssetId = "generator" | "pos-business" | "borehole";

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
  // This choice only appears if the character already owns this asset —
  // for durable goods (you can't run a generator you never bought).
  requiresAsset?: AssetId;
  // This choice only appears if character.stats.naira is at least this —
  // for affording a specific large discretionary cost up front, rather
  // than letting any choice drive naira below 0 (applyDelta still clamps
  // naira at 0, so small/forced costs — bribes, fares — stay choosable
  // even when they'd wipe out what little the character has).
  requiresNaira?: number;
  // Resolving this choice adds this asset to the character permanently.
  grantsAsset?: AssetId;
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
        result: "Papa grumbles about fuel money but switches it on for an hour.",
        delta: { naira: -700, happiness: 2 },
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
        delta: { naira: 500, happiness: 1 },
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
        delta: { naira: -18000, health: -2, smarts: 1 },
      },
      {
        label: "Ask family to help",
        result: "They cover most of it. It costs you a favour you'll owe later.",
        delta: { naira: -3000, happiness: -1 },
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
        delta: { happiness: -1 },
      },
      {
        label: "Take the money just once",
        result: "₦25,000 in your hand feels good. The debt they expect back does not.",
        delta: { naira: 25000, happiness: -3, health: -1 },
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
    prompt: "The conductor insists the fare just went up and won't give your ₦150 change.",
    choices: [
      {
        label: "Argue for your change",
        result: "The whole bus gets involved. You get it back, eventually.",
        delta: { naira: 150, happiness: -1 },
      },
      {
        label: "Let it go",
        result: "Not worth the stress today. You let the ₦150 go.",
        delta: { naira: -150, happiness: -1 },
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
        delta: { naira: -1000, happiness: -2 },
      },
      {
        label: "Refuse and ask for his ID number",
        result: "A tense minute passes. He waves you through, irritated.",
        delta: { happiness: 2, health: -1 },
      },
    ],
  },
  {
    id: "generator-opportunity",
    bands: ["adult"],
    prompt: "A neighbour needs quick cash and is selling his small \"I better pass my neighbour\" generator for ₦180,000.",
    choices: [
      {
        label: "Buy it",
        result: "It's yours — no more sitting in the dark every time NEPA fails.",
        delta: { naira: -180000, happiness: 3 },
        requiresNaira: 180000,
        grantsAsset: "generator",
      },
      {
        label: "Can't spare that right now",
        result: "You watch him sell it to someone else by evening.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "generator-bill",
    bands: ["adult"],
    prompt: "NEPA has taken light for four days straight.",
    choices: [
      {
        label: "Run the generator (≈16L of fuel)",
        result: "At least the fridge stays cold and the fan keeps running.",
        delta: { naira: -22400, happiness: 1 },
        requiresAsset: "generator",
      },
      {
        label: "Manage without it",
        result: "You sweat through the nights, and the fridge food spoils — ₦3,000 wasted.",
        delta: { naira: -3000, health: -2, happiness: -2 },
      },
    ],
  },
  {
    id: "pos-hustle",
    bands: ["adult"],
    prompt: "A friend offers you a stake in a POS (point-of-sale) agent business on your street — ₦150,000 for the machine and float.",
    choices: [
      {
        label: "Invest",
        result: "Risky, but the commissions start trickling in.",
        delta: { naira: -150000, happiness: 2 },
        requiresNaira: 150000,
        grantsAsset: "pos-business",
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
    prompt: "A relative calls asking for ₦25,000 to help with a hospital bill.",
    choices: [
      {
        label: "Send what you can",
        result: "It's tight this month, but family is family.",
        delta: { naira: -25000, happiness: 2 },
      },
      {
        label: "Explain you can't right now",
        result: "The silence on the phone says more than words would.",
        delta: { happiness: -3 },
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
        delta: { naira: -20000, happiness: 3, smarts: 1 },
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
        delta: { naira: -500, happiness: 1, health: -2 },
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
        delta: { naira: -5000, happiness: 3 },
      },
      {
        label: "Give what's comfortable",
        result: "Nobody's counting but you, and you're at peace with it.",
        delta: { naira: -500, happiness: 1 },
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
        result: "You're exhausted, but the extra effort gets noticed — a ₦20,000 bonus.",
        delta: { naira: 20000, health: -2, smarts: 1 },
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
    prompt: "You're invited to a big owambe party this weekend — new aso-ebi required, ₦25,000 for the fabric and tailoring.",
    choices: [
      {
        label: "Buy the aso-ebi and go all out",
        result: "You dance till your feet hurt. Worth every naira.",
        delta: { naira: -25000, happiness: 4, looks: 1 },
        requiresNaira: 25000,
      },
      {
        label: "Attend in something simple",
        result: "A few side-eyes, but you still have a good time.",
        delta: { naira: -3000, happiness: 2 },
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
        result: "He budges a little. You still pay ₦40,000 more than last year.",
        delta: { naira: -40000, happiness: 1 },
      },
      {
        label: "Start quietly looking for a new place",
        result: "House-hunting in Lagos is its own full-time job.",
        delta: { naira: -15000, happiness: -2 },
      },
    ],
  },
  {
    id: "sibling-school-fees",
    bands: ["adult"],
    prompt: "Your younger sibling's school fees (₦60,000) are due and your parents are short.",
    choices: [
      {
        label: "Cover it all yourself",
        result: "Your account is thinner, but your sibling stays in school.",
        delta: { naira: -60000, happiness: 3 },
        requiresNaira: 60000,
      },
      {
        label: "Contribute what you can",
        result: "You split the difference, and so does the family's relief.",
        delta: { naira: -20000, happiness: 1 },
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
        delta: { naira: -15000, health: 4 },
        requiresNaira: 15000,
      },
      {
        label: "Just rest it off",
        result: "You feel a little better, but you're not sure what it was.",
        delta: { health: 1, happiness: -1 },
      },
    ],
  },
  {
    id: "borehole-opportunity",
    bands: ["adult"],
    prompt: "A driller working your street offers to sink a borehole for your compound — ₦250,000, done in a week.",
    choices: [
      {
        label: "Pay for it",
        result: "No more begging a neighbour's tap or waiting on a tanker.",
        delta: { naira: -250000, happiness: 3 },
        requiresNaira: 250000,
        grantsAsset: "borehole",
      },
      {
        label: "Can't manage that right now",
        result: "You keep queuing at the compound tap like everyone else.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "water-scarcity",
    bands: ["adult"],
    prompt: "Dry season — the compound tap has run dry and everyone's buying water.",
    choices: [
      {
        label: "Draw from your own borehole",
        result: "You barely notice the dry season this year.",
        delta: { naira: -500, happiness: 1 },
        requiresAsset: "borehole",
      },
      {
        label: "Pay for a water tanker",
        result: "The tanker man knows the whole street is desperate — he charges for it.",
        delta: { naira: -15000, happiness: -1 },
      },
    ],
  },
  {
    id: "omo-onile-dispute",
    bands: ["adult"],
    prompt: "You go to view a plot of land. Before you've even finished looking, \"omo-onile\" youths show up demanding an \"access fee.\"",
    choices: [
      {
        label: "Pay the \"access fee\"",
        result: "₦10,000 lighter, but at least they let you finish looking.",
        delta: { naira: -10000, happiness: -1 },
      },
      {
        label: "Walk away from the land deal",
        result: "Not worth the headache. You cross that plot off your list.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "burial-contribution",
    bands: ["adult"],
    prompt: "A relative has passed, and the family is pooling money for the burial — your share comes to ₦30,000.",
    choices: [
      {
        label: "Contribute your share",
        result: "It's expected of you, and you don't want to be the one who didn't show up.",
        delta: { naira: -30000, happiness: 1 },
        requiresNaira: 30000,
      },
      {
        label: "Explain you can't right now",
        result: "Nobody says anything to your face. That's almost worse.",
        delta: { happiness: -3 },
      },
    ],
  },
  {
    id: "wedding-costs",
    bands: ["adult"],
    prompt: "You're getting married. The question is how big.",
    choices: [
      {
        label: "Go all out — the full owambe",
        result: "A day you'll both talk about for years. The bills take longer to recover from.",
        delta: { naira: -300000, happiness: 10 },
        requiresNaira: 300000,
      },
      {
        label: "Keep it small and simple",
        result: "Just close family and a quiet reception. Still yours.",
        delta: { naira: -50000, happiness: 4 },
      },
    ],
  },
  {
    id: "keke-dispute",
    bands: ["adult"],
    prompt: "The keke rider tries to charge double, claiming \"fuel don cost.\"",
    choices: [
      {
        label: "Argue him down to the normal fare",
        result: "He grumbles but accepts the normal ₦300.",
        delta: { naira: -300, happiness: -1 },
      },
      {
        label: "Just pay what he's asking",
        result: "₦600 for a short ride, but you're not in the mood to argue today.",
        delta: { naira: -600, happiness: -1 },
      },
    ],
  },
  {
    id: "market-levy",
    bands: ["adult"],
    prompt: "Touts show up at your stall demanding a daily \"levy\" — again.",
    choices: [
      {
        label: "Pay it to avoid trouble",
        result: "Cheaper than the alternative, this time.",
        delta: { naira: -2000 },
      },
      {
        label: "Refuse",
        result: "Words are exchanged. Your stall stays intact, barely.",
        delta: { happiness: -3, health: -1 },
      },
    ],
  },
];
