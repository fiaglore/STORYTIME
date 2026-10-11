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

export type AgeBand = "infant" | "child" | "teen" | "adult" | "elder";

// Durable goods a character can own, persisted on LifeCharacter.assets.
// Granted by resolving a choice with grantsAsset, checked by choices with
// requiresAsset (e.g. you can't choose to run a generator you don't own).
export type AssetId = "generator" | "pos-business" | "borehole" | "logistics-business";

export interface StatDelta {
  happiness?: number;
  health?: number;
  smarts?: number;
  looks?: number;
  naira?: number;
}

// A choice tagged with risk can, on top of its normal delta, maim or kill
// the character outright — see resolveEvent in lifeSim.ts. chance is the
// odds (0-1) the risky outcome fires at all; of those, fatalShare is the
// odds it's fatal rather than "merely" a maiming. Both outcomes can be
// recovered from for naira — see REVIVE_COST/reviveCharacter and
// CRITICAL_HEALTH_THRESHOLD/treatInjury in lifeSim.ts.
export interface EventRisk {
  chance: number;
  fatalShare: number;
  maimDelta: StatDelta;
  maimResult: string;
  deathResult: string;
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
  // The "choosing a risky option could kill or maim them" gate — see
  // EventRisk above. Most choices don't carry this; it's reserved for
  // choices whose flavor text is already describing real danger (racing
  // through traffic, defying armed men, chasing a thief into a crowd).
  risk?: EventRisk;
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
  // 60 matches both RETIREMENT_AGE in lifeSim.ts and LIFE_STAGES' "elder"
  // band start — not a coincidence.
  if (age <= 59) return "adult";
  return "elder";
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
        risk: {
          chance: 0.18,
          fatalShare: 0.15,
          maimDelta: { health: -35, happiness: -15 },
          maimResult: "A \"debt collection\" turns violent — you're badly beaten before they let you go.",
          deathResult: "The debt collection goes too far. You don't survive it.",
        },
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
    prompt: "Third Mainland Bridge is pure go-slow today and you're already late for work.",
    choices: [
      {
        label: "Try an okada through the gaps",
        result: "Terrifying, but you make it on time, heart pounding.",
        delta: { naira: -500, happiness: 1, health: -2 },
        risk: {
          chance: 0.12,
          fatalShare: 0.2,
          maimDelta: { health: -40, looks: -10 },
          maimResult: "The okada clips a danfo's mirror and you go down hard on the asphalt.",
          deathResult: "The okada doesn't make it through the gap. Neither do you.",
        },
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
    bands: ["adult", "teen", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "teen", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
    bands: ["adult", "elder"],
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
  {
    id: "flood-damage",
    bands: ["adult", "elder"],
    prompt: "Heavy rain floods the compound overnight. Water got into the room.",
    choices: [
      {
        label: "Pay for repairs now",
        result: "A plumber and a mason later, the room is dry again.",
        delta: { naira: -40000, happiness: 1 },
        requiresNaira: 40000,
      },
      {
        label: "Patch it yourself and hope",
        result: "Rainy season isn't over yet. You'll be doing this again.",
        delta: { health: -2, happiness: -2 },
      },
    ],
  },
  {
    id: "danfo-breakdown",
    bands: ["adult", "elder"],
    prompt: "The danfo breaks down in the middle of traffic. Everyone's filing out.",
    choices: [
      {
        label: "Pay for another bus",
        result: "A few hundred naira poorer, but you still make it to work.",
        delta: { naira: -300, happiness: -1 },
      },
      {
        label: "Trek the rest of the way",
        result: "Your feet hate you by the time you arrive.",
        delta: { health: -2, happiness: -1 },
      },
    ],
  },
  {
    id: "apartment-hunting-fees",
    bands: ["adult", "elder"],
    prompt: "You've found a decent apartment, but the agent wants a full year's rent plus 10% agency and 10% legal fees — all at once.",
    choices: [
      {
        label: "Pay it all and move in",
        result: "Everything you'd saved, gone in one transfer. But the place is yours.",
        delta: { naira: -800000, happiness: 4 },
        requiresNaira: 800000,
      },
      {
        label: "Keep managing where you are",
        result: "Another year in the old place. The ceiling still leaks.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "okada-ban",
    bands: ["adult", "elder"],
    prompt: "The state bans okada on your usual route again — no warning, just a checkpoint turning bikes back.",
    choices: [
      {
        label: "Trek the long way round",
        result: "Twenty extra minutes each way, on foot, every day this week.",
        delta: { health: -2, happiness: -1 },
      },
      {
        label: "Pay extra for a keke instead",
        result: "More expensive, but at least you're not trekking in the sun.",
        delta: { naira: -800 },
      },
    ],
  },
  {
    id: "pickpocket",
    bands: ["adult", "teen", "elder"],
    prompt: "The BRT is packed shoulder to shoulder. By the time you notice, your pocket's already lighter.",
    choices: [
      {
        label: "Chase after them, shouting \"Ole!\"",
        result: "You don't catch them, and now you're bruised from the scramble too.",
        delta: { naira: -3000, health: -2, happiness: -2 },
        risk: {
          chance: 0.1,
          fatalShare: 0.1,
          maimDelta: { health: -30 },
          maimResult: "The crowd turns into a mob and you get caught in the chaos of \"jungle justice\".",
          deathResult: "The mob scene turns deadly before anyone can pull you out of it.",
        },
      },
      {
        label: "Let it go — it's already gone",
        result: "Not worth getting hurt over money you won't see again.",
        delta: { naira: -3000, happiness: -1 },
      },
    ],
  },
  {
    id: "mosque-giving",
    bands: ["adult", "teen", "elder"],
    prompt: "It's Jumat, and the collection is going round after prayers.",
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
    id: "salary-delay",
    bands: ["adult", "elder"],
    prompt: "Payday comes and goes. The office says it's \"a network issue\" — again.",
    choices: [
      {
        label: "Vent to your colleagues about it",
        result: "Misery loves company. Everyone's in the same boat this month.",
        delta: { happiness: 1 },
      },
      {
        label: "Keep it bottled and keep working",
        result: "Swallowing it doesn't make the bills wait any longer.",
        delta: { happiness: -2, health: -1 },
      },
    ],
  },
  {
    id: "malaria",
    bands: ["child", "teen", "adult", "elder"],
    prompt: "The fever hits hard — malaria again, probably from the standing water near the compound.",
    choices: [
      {
        label: "Go to a proper hospital for treatment",
        result: "A real test, real drugs, and you're back on your feet in days.",
        delta: { naira: -8000, health: 5 },
        requiresNaira: 8000,
      },
      {
        label: "Buy cheap drugs from the roadside chemist",
        result: "Cheaper, and it mostly works, but you're never quite sure what you swallowed.",
        delta: { naira: -1500, health: 1 },
      },
    ],
  },
  {
    id: "village-remittance",
    bands: ["adult", "elder"],
    prompt: "End of year, and the village union calls — it's time for the annual development levy.",
    choices: [
      {
        label: "Send your contribution",
        result: "Your name gets called out with respect at the next meeting.",
        delta: { naira: -15000, happiness: 2 },
        requiresNaira: 15000,
      },
      {
        label: "Skip it this year",
        result: "Word travels fast back home. You'll hear about this one.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "armed-robbery",
    bands: ["adult", "elder"],
    prompt: "Armed men stop your car at a quiet junction. \"Oga, everything you get, bring am.\"",
    choices: [
      {
        label: "Hand over your phone and cash quietly",
        result: "They take what you have and vanish into the dark. You're shaken but unharmed.",
        delta: { naira: -12000, happiness: -4 },
      },
      {
        label: "Try to drive off before they react",
        result: "Tyres screaming, you make it out — this time.",
        delta: { happiness: 3 },
        risk: {
          chance: 0.25,
          fatalShare: 0.3,
          maimDelta: { health: -45, looks: -10 },
          maimResult: "A shot hits the car as you speed off — you make it to a hospital, barely.",
          deathResult: "The getaway doesn't work. The robbers don't miss.",
        },
      },
    ],
  },
  {
    id: "okada-race-dare",
    bands: ["teen"],
    prompt: "Your friends dare you to race okadas down a stretch of the expressway after school.",
    choices: [
      {
        label: "Sit this one out",
        result: "They call you soft for a week, then forget about it.",
        delta: { happiness: -2 },
      },
      {
        label: "Race — you're not backing down",
        result: "Wind in your face, heart pounding — you win, barely, and walk away grinning.",
        delta: { happiness: 4, looks: 1 },
        risk: {
          chance: 0.15,
          fatalShare: 0.25,
          maimDelta: { health: -35, looks: -15 },
          maimResult: "You lose control at speed and go down hard on the tarmac.",
          deathResult: "You lose control at speed. There's no walking away from this one.",
        },
      },
    ],
  },
  {
    id: "extra-lessons",
    bands: ["child"],
    prompt: "Your teacher says you could do better with extra lessons after school — ₦2,000 a week.",
    choices: [
      {
        label: "Ask Mama to pay for the lessons",
        result: "She sighs, counts the notes twice, and agrees. Your handwriting improves first.",
        delta: { naira: -2000, smarts: 3 },
        requiresNaira: 2000,
      },
      {
        label: "Study with the older girl next door instead",
        result: "Free, and she's strict. You learn, just slower.",
        delta: { smarts: 1, happiness: -1 },
      },
    ],
  },
  {
    id: "harmattan-dust",
    bands: ["child"],
    prompt: "Harmattan dust has turned the whole street the colour of flour, and your lips are cracking.",
    choices: [
      {
        label: "Wear the scarf and rub on the Vaseline",
        result: "Mama fusses, but your lips and your chest survive the season.",
        delta: { health: 1 },
      },
      {
        label: "Play outside like nothing is wrong",
        result: "Great games, terrible cough by Sunday.",
        delta: { happiness: 2, health: -3 },
      },
    ],
  },
  {
    id: "cultural-day",
    bands: ["child"],
    prompt: "Your school is picking dancers for cultural day.",
    choices: [
      {
        label: "Put your hand up",
        result: "You mix up one step and nobody remembers but you. The stage was yours.",
        delta: { happiness: 3, looks: 1 },
      },
      {
        label: "Hide at the back of the class",
        result: "You watch from the crowd, a little jealous.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "puff-puff-seller",
    bands: ["child"],
    prompt: "A woman sells hot puff-puff outside the school gate, and you have ₦200 in your pocket.",
    choices: [
      {
        label: "Buy some",
        result: "Hot, sugary, gone in a minute. Worth it.",
        delta: { naira: -200, happiness: 2 },
      },
      {
        label: "Save the money",
        result: "You keep it. The smell follows you all the way home.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "broken-toy",
    bands: ["child"],
    prompt: "Your younger cousin, visiting for the holidays, breaks your best toy.",
    choices: [
      {
        label: "Tell Mama",
        result: "She scolds him, then scolds you for tattling. Fair, apparently.",
        delta: { happiness: -1 },
      },
      {
        label: "Forgive him and share your other toys",
        result: "He follows you around for the rest of the holiday.",
        delta: { happiness: 2 },
      },
    ],
  },
  {
    id: "street-football",
    bands: ["child"],
    prompt: "The boys on your street are one player short for a football match.",
    choices: [
      {
        label: "Join the game",
        result: "You scrape your knee and score once. You'll tell this story for years.",
        delta: { happiness: 3, health: -1 },
      },
      {
        label: "Watch from the gate",
        result: "Safer behind the gate, and a little boring.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "village-visit",
    bands: ["child"],
    prompt: "School is on break, and Mama says the whole family is travelling to the village to see Grandma.",
    choices: [
      {
        label: "Go with the family",
        result: "A long, hot bus ride, then more food than you can finish.",
        delta: { naira: -1500, happiness: 3, health: -1 },
      },
      {
        label: "Stay with the neighbour",
        result: "Quiet days, and everyone comes back with stories you missed.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "lost-in-market",
    bands: ["child"],
    prompt: "In the crowded market you let go of Mama's wrapper — and suddenly she's gone.",
    choices: [
      {
        label: "Stay where you are and wait",
        result: "Mama finds you in five frightening minutes. You hold her hand the whole way home.",
        delta: { happiness: -1 },
      },
      {
        label: "Ask a trader at a stall to call for her",
        result: "He announces your name over his loudspeaker, and half the market cheers when she appears.",
        delta: { happiness: 1, smarts: 1 },
      },
    ],
  },
  {
    id: "business-partnership",
    bands: ["adult", "elder"],
    prompt: "A well-connected acquaintance offers you a stake in a small logistics business — ₦2,000,000 for a share of a delivery fleet.",
    choices: [
      {
        label: "Invest",
        result: "Slow at first, then the delivery contracts start paying out.",
        delta: { naira: -2000000, happiness: 2, smarts: 1 },
        requiresNaira: 2000000,
        grantsAsset: "logistics-business",
      },
      {
        label: "Politely decline",
        result: "You watch him sign someone else up by the end of the week.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "tax-audit",
    bands: ["adult", "elder"],
    prompt: "A tax officer shows up with a letter about three years of your returns.",
    choices: [
      {
        label: "Pay a tax consultant to handle it",
        result: "Expensive, but the letter goes away.",
        delta: { naira: -400000, happiness: -1 },
        requiresNaira: 400000,
      },
      {
        label: "Handle it yourself",
        result: "Weeks of paperwork and bad coffee, but you learn more about tax than you wanted to.",
        delta: { health: -2, happiness: -3, smarts: 2 },
      },
    ],
  },
  {
    id: "kidnap-scare",
    bands: ["adult", "elder"],
    prompt: "A man in your circle was kidnapped for ransom last week. Your driver suggests varying your routes.",
    choices: [
      {
        label: "Hire private security",
        result: "Two quiet men in the car and your mind at ease.",
        delta: { naira: -1500000, happiness: 1 },
        requiresNaira: 1500000,
      },
      {
        label: "Carry on as usual",
        result: "Nothing happens, but you check the mirror more than you used to.",
        delta: { happiness: -3 },
        risk: {
          chance: 0.08,
          fatalShare: 0.25,
          maimDelta: { health: -40, happiness: -15 },
          maimResult: "Armed men box in your car one evening. You survive, but not unharmed.",
          deathResult: "Armed men box in your car one evening. You are not seen again.",
        },
      },
    ],
  },
  {
    id: "charity-gala",
    bands: ["adult", "elder"],
    prompt: "You're invited to a charity gala where everyone knows exactly how much everyone else gives.",
    choices: [
      {
        label: "Give big and be seen giving",
        result: "Cameras flash. The cause genuinely benefits.",
        delta: { naira: -750000, happiness: 4 },
        requiresNaira: 750000,
      },
      {
        label: "Give quietly",
        result: "No photos, no pressure, but a few raised eyebrows.",
        delta: { naira: -50000, happiness: 1 },
      },
    ],
  },
  {
    id: "staff-fraud",
    bands: ["adult", "elder"],
    prompt: "Your driver has been padding the fuel receipts for months.",
    choices: [
      {
        label: "Confront him and settle it quietly",
        result: "He promises to do better. You keep an eye on the receipts.",
        delta: { happiness: -1 },
      },
      {
        label: "Sack him and hire someone new",
        result: "Agency fees and a week of chaos, but the receipts add up now.",
        delta: { naira: -80000, happiness: -2 },
      },
    ],
  },
  {
    id: "island-party",
    bands: ["adult", "elder"],
    prompt: "A yacht party on the lagoon this weekend — guest list by invitation only.",
    choices: [
      {
        label: "Attend",
        result: "Music, skyline, and more small talk than you can count.",
        delta: { naira: -250000, happiness: 5, looks: 1 },
      },
      {
        label: "Decline politely",
        result: "You stay in and sleep early, a little curious about what you missed.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "ramadan-fast",
    bands: ["adult", "teen", "elder"],
    prompt: "Ramadan begins, and the days are long in the Lagos heat.",
    choices: [
      {
        label: "Keep the full fast",
        result: "Hungry and tired, but the evenings with family feel richer for it.",
        delta: { health: -2, happiness: 3 },
      },
      {
        label: "Fast on the days you can",
        result: "You do what your body allows and make peace with the rest.",
        delta: { happiness: 1 },
      },
    ],
  },
  {
    id: "christmas-village-trip",
    bands: ["adult", "teen", "elder"],
    prompt: "December arrives, and the whole family is travelling to the village for Christmas.",
    choices: [
      {
        label: "Make the trip",
        result: "Hours on the road, but the jollof and the noise are worth every minute.",
        delta: { naira: -35000, happiness: 4, health: -1 },
        requiresNaira: 35000,
      },
      {
        label: "Stay in Lagos this year",
        result: "Quiet streets and a pang of missing out.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "new-yam-festival",
    bands: ["adult", "teen", "elder"],
    prompt: "The new yam festival is back in your family's hometown, and the elders expect you to bring something for the feast.",
    choices: [
      {
        label: "Bring yams and palm wine",
        result: "The elders nod approval, and you eat until you can't move.",
        delta: { naira: -12000, happiness: 3 },
        requiresNaira: 12000,
      },
      {
        label: "Send a message and some money instead",
        result: "It's noted that you weren't there.",
        delta: { naira: -5000, happiness: -1 },
      },
    ],
  },
  {
    id: "faith-questions",
    bands: ["adult", "elder"],
    prompt: "At a family gathering, an aunty asks pointedly why she never sees you at any place of worship.",
    choices: [
      {
        label: "Smile and change the subject",
        result: "She lets it go — for now.",
        delta: { happiness: -1 },
      },
      {
        label: "Explain what you believe, calmly",
        result: "A few raised eyebrows, one surprisingly good conversation.",
        delta: { happiness: 1, smarts: 1 },
      },
    ],
  },
  {
    id: "pos-float-shortage",
    bands: ["adult", "elder"],
    prompt: "A network failure leaves your POS float short after a long queue of customers.",
    choices: [
      {
        label: "Top up the float from your own savings",
        result: "Costly, but your regulars stay regulars.",
        delta: { naira: -30000, happiness: -1 },
        requiresNaira: 30000,
      },
      {
        label: "Close early and apologize",
        result: "Some customers grumble and walk to the next stand.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "pos-reversal-dispute",
    bands: ["adult", "elder"],
    prompt: "A customer claims a transfer failed and demands a refund — the bank's records say otherwise.",
    choices: [
      {
        label: "Refund him to keep the peace",
        result: "Fifteen thousand lighter, and he never says thank you.",
        delta: { naira: -15000, happiness: -1 },
      },
      {
        label: "Show the receipt and hold your ground",
        result: "A loud argument, a crowd, and eventually an apology you didn't need.",
        delta: { happiness: -2, health: -1 },
      },
    ],
  },
  {
    id: "logistics-truck-breakdown",
    bands: ["adult", "elder"],
    prompt: "One of your delivery trucks breaks down mid-route with a client's goods on board.",
    choices: [
      {
        label: "Pay for emergency repairs",
        result: "The truck is back on the road by evening, and the client never knows.",
        delta: { naira: -120000, happiness: -1 },
        requiresNaira: 120000,
      },
      {
        label: "Hire another truck for the day",
        result: "The delivery makes it, with a long phone call of apologies.",
        delta: { naira: -40000, happiness: -1 },
      },
    ],
  },
  {
    id: "grandchildren-visit",
    bands: ["elder"],
    prompt: "Your grandchildren are around for the weekend, full of noise and questions.",
    choices: [
      {
        label: "Spoil them with treats and stories",
        result: "They leave sugar-high and happy; you're exhausted but glowing.",
        delta: { naira: -8000, happiness: 4 },
      },
      {
        label: "Keep it simple — just your company",
        result: "They remember the time, not the money spent on it.",
        delta: { happiness: 2 },
      },
    ],
  },
  {
    id: "chieftaincy-title",
    bands: ["elder"],
    prompt: "The community elders offer you a chieftaincy title — an honour, but not a free one.",
    choices: [
      {
        label: "Accept — pay the installation costs",
        result: "You're installed with drumming and praise names. Respect follows you everywhere now.",
        delta: { naira: -1500000, happiness: 6 },
        requiresNaira: 1500000,
      },
      {
        label: "Decline, respectfully",
        result: "Some call it humility; others whisper you couldn't afford it.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "burial-society-dues",
    bands: ["elder"],
    prompt: "Your age-grade burial society collects its annual dues — everyone contributes toward whoever goes next.",
    choices: [
      {
        label: "Pay your share",
        result: "A grim bit of bookkeeping, but it's how the community takes care of its own.",
        delta: { naira: -15000, happiness: 1 },
      },
      {
        label: "Skip it this year",
        result: "Word gets around. A few old friends go quiet on you.",
        delta: { happiness: -2 },
      },
    ],
  },
  {
    id: "estate-planning",
    bands: ["elder"],
    prompt: "A lawyer friend suggests you finally put your affairs in writing.",
    choices: [
      {
        label: "Draw up a proper will",
        result: "It costs you, but it's one less thing hanging over the family's head.",
        delta: { naira: -60000, happiness: 2 },
        requiresNaira: 60000,
      },
      {
        label: "Leave it for now",
        result: "You'll get to it. Probably.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "elder-scam-call",
    bands: ["elder"],
    prompt: "A stranger calls claiming to be your bank, asking you to confirm your account details urgently.",
    choices: [
      {
        label: "Hang up and call the bank yourself",
        result: "The bank confirms it was a scam call — you dodged it.",
        delta: { happiness: 1 },
      },
      {
        label: "It sounds convincing — you give the details",
        result: "By morning, a chunk of your savings is gone.",
        delta: { naira: -200000, happiness: -5 },
      },
    ],
  },
  {
    id: "routine-checkup",
    bands: ["elder"],
    prompt: "It's time for your yearly medical checkup — the kind you keep putting off.",
    choices: [
      {
        label: "Go through with the full checkup",
        result: "Nothing major, but the doctor catches a small issue early.",
        delta: { naira: -25000, health: 4 },
        requiresNaira: 25000,
      },
      {
        label: "Skip it — you feel fine",
        result: "Fine for now. Maybe next year.",
        delta: { health: -2 },
      },
    ],
  },
  {
    id: "downsize-the-house",
    bands: ["elder"],
    prompt: "The house feels too big and too quiet these days. An agent suggests downsizing.",
    choices: [
      {
        label: "Sell up and move somewhere smaller",
        result: "Less to maintain, and a tidy sum left over.",
        delta: { naira: 4500000, happiness: 2 },
      },
      {
        label: "Stay — too many memories here",
        result: "The upkeep is a lot, but it's home.",
        delta: { naira: -50000, happiness: 1 },
      },
    ],
  },
  {
    id: "mentor-at-work",
    bands: ["elder"],
    prompt: "A younger colleague keeps coming to you for advice on how things really work.",
    choices: [
      {
        label: "Take them under your wing properly",
        result: "Watching them grow reminds you why you ever liked this job.",
        delta: { happiness: 3 },
      },
      {
        label: "Give quick answers and move on",
        result: "You're too tired these days for a full mentorship.",
        delta: { happiness: 0 },
      },
    ],
  },
  {
    id: "community-council-invite",
    bands: ["elder"],
    prompt: "The local community development council wants your voice on their panel.",
    choices: [
      {
        label: "Join — your experience could help",
        result: "Meetings run long, but you help settle a real dispute over market stalls.",
        delta: { naira: -5000, happiness: 3 },
      },
      {
        label: "Decline — you'd rather rest",
        result: "You hear about the meetings secondhand instead.",
        delta: { happiness: 0 },
      },
    ],
  },
  {
    id: "old-friends-reunion",
    bands: ["elder"],
    prompt: "A handful of old schoolmates organize a reunion — some you haven't seen in decades.",
    choices: [
      {
        label: "Go, and contribute toward the venue",
        result: "Old jokes, older stories, and a night that makes you feel young again.",
        delta: { naira: -20000, happiness: 5 },
      },
      {
        label: "Send your regards instead",
        result: "You hear it was a good time. You half-regret missing it.",
        delta: { happiness: -1 },
      },
    ],
  },
  {
    id: "village-land-dispute",
    bands: ["elder"],
    prompt: "A relative claims your late father's village land was never properly shared, and wants your share back.",
    choices: [
      {
        label: "Hire a lawyer and fight for your claim",
        result: "A long, tiring process, but the land stays yours on paper.",
        delta: { naira: -180000, happiness: -2 },
        requiresNaira: 180000,
      },
      {
        label: "Let it go for the sake of peace",
        result: "The family stays close. The land doesn't.",
        delta: { happiness: 1 },
      },
    ],
  },
  {
    id: "grandchild-school-fees",
    bands: ["elder"],
    prompt: "Your daughter calls — she's short for your grandchild's school fees this term.",
    choices: [
      {
        label: "Cover it",
        result: "The relief in her voice is worth more than the money.",
        delta: { naira: -90000, happiness: 3 },
        requiresNaira: 90000,
      },
      {
        label: "Explain you can't manage it this time",
        result: "She understands, but it stings to say no.",
        delta: { happiness: -2 },
      },
    ],
  },
];
