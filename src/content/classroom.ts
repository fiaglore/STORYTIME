import type { StatDelta } from "./lifeEvents";

// "A section for classrooms where they can speak with teacher and
// classmates" per the design ask. These are NPCs, not real players —
// Lagos Life's real-player social features (Marriage, chat, send money)
// are all gated to signed-in adults (age >= 18); school-age characters
// get this instead, a lighter-weight flavor interaction with a fixed
// cast rather than a second real-time multiplayer surface to build and
// moderate (see CLAUDE.md's "Chat" section for how much safety-rail work
// the real-player version already needs).
export interface ClassroomLine {
  prompt: string;
  delta: StatDelta;
}

export interface ClassroomNPC {
  id: string;
  name: string;
  role: "teacher" | "classmate";
  lines: ClassroomLine[];
}

export const CLASSROOM_NPCS: ClassroomNPC[] = [
  {
    id: "teacher-mrs-adaeze",
    name: "Mrs. Adaeze",
    role: "teacher",
    lines: [
      { prompt: "\"You're doing well — keep that up.\" She writes a little star next to your name.", delta: { happiness: 2, smarts: 1 } },
      { prompt: "She goes over a tricky question with you until it finally clicks.", delta: { smarts: 3 } },
      { prompt: "\"Sit up straight and pay attention,\" she says, not unkindly.", delta: { happiness: -1, smarts: 1 } },
      { prompt: "She tells a story from her own school days that has the whole class laughing.", delta: { happiness: 2 } },
    ],
  },
  {
    id: "classmate-tunde",
    name: "Tunde",
    role: "classmate",
    lines: [
      { prompt: "Tunde trades you half his meat pie for your biscuit — good deal, honestly.", delta: { happiness: 2 } },
      { prompt: "He shows you a new game everyone's playing at break time.", delta: { happiness: 2 } },
      { prompt: "You help him with a question he's stuck on.", delta: { smarts: 1, happiness: 1 } },
      { prompt: "He won't stop talking about the football match — you half-listen.", delta: { happiness: 1 } },
    ],
  },
  {
    id: "classmate-bisi",
    name: "Bisi",
    role: "classmate",
    lines: [
      { prompt: "Bisi shares her notes with you before the test.", delta: { smarts: 2, happiness: 1 } },
      { prompt: "She tells you a secret and makes you promise not to tell.", delta: { happiness: 2 } },
      { prompt: "You two practice spellings together at break.", delta: { smarts: 2 } },
      { prompt: "She's in a mood today and snaps at you over nothing.", delta: { happiness: -2 } },
    ],
  },
  {
    id: "classmate-chidi",
    name: "Chidi",
    role: "classmate",
    lines: [
      { prompt: "Chidi dares you to race him to the gate — you lose, barely.", delta: { happiness: 2, health: -1 } },
      { prompt: "He shows off a new toy his uncle sent from abroad.", delta: { happiness: 1 } },
      { prompt: "You both get told off for talking during class.", delta: { happiness: -1 } },
      { prompt: "He saves you a seat at lunch.", delta: { happiness: 2 } },
    ],
  },
];

export function randomClassroomLine(npc: ClassroomNPC): ClassroomLine {
  return npc.lines[Math.floor(Math.random() * npc.lines.length)];
}
