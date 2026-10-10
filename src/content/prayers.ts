import type { FaithId } from "./characterCreation";

// Faith-flavored text for the Pray action (see pray() in lifeSim.ts) — the
// mechanic itself (random answered/unanswered, same odds and stat effect
// ranges) is identical across faiths, only the words differ. "Atheist"
// still gets a pray action (talking to the universe / hoping against hope)
// since the design asks for "speak with your God" to cover everyone who
// opts in, not just the religious options.
export interface PrayerFlavor {
  verb: string;
  answered: string[];
  unanswered: string[];
}

export const PRAYER_FLAVORS: Record<FaithId, PrayerFlavor> = {
  christian: {
    verb: "Pray",
    answered: [
      "You prayed, and it felt like Heaven answered — a quiet peace, then a door opened.",
      "\"Ask and it shall be given\" — today, it was given.",
      "You felt God's hand move in your favor.",
    ],
    unanswered: [
      "You prayed. Heaven was silent today.",
      "No answer came — you keep believing anyway.",
      "God's timing, they say. Today just wasn't the day.",
    ],
  },
  muslim: {
    verb: "Pray",
    answered: [
      "You made du'a, and Allah answered — relief came when you least expected it.",
      "Alhamdulillah — the prayer was accepted.",
      "You felt your prayer lifted and answered.",
    ],
    unanswered: [
      "You made du'a. Nothing changed today — Allah's plan is Allah's plan.",
      "No answer came today. You trust it's written for a reason.",
      "You prayed and waited. Today, the waiting continued.",
    ],
  },
  traditional: {
    verb: "Consult the ancestors",
    answered: [
      "The ancestors heard you — a sign came, and fortune followed.",
      "You poured libation and felt the spirits favor you.",
      "The elders' spirits answered your call.",
    ],
    unanswered: [
      "You consulted the ancestors. The spirits stayed quiet today.",
      "No sign came — the ancestors are not always in a hurry.",
      "You waited for a sign. None came today.",
    ],
  },
  atheist: {
    verb: "Hope against hope",
    answered: [
      "You didn't pray to anyone, but somehow, luck broke your way today.",
      "No god, no prayer — just a coincidence that worked out in your favor.",
      "You hoped, quietly, and the universe happened to cooperate.",
    ],
    unanswered: [
      "You hoped, knowing nothing was listening. Nothing changed.",
      "No higher power, no answer — just an ordinary day.",
      "You shrugged it off. The universe owes nobody anything.",
    ],
  },
  other: {
    verb: "Seek guidance",
    answered: [
      "Whatever you believe in, something answered — things turned your way.",
      "You sought guidance, and found it.",
      "Your own kind of faith paid off today.",
    ],
    unanswered: [
      "You sought guidance. None came today.",
      "No answer, no sign — just another day to keep going.",
      "You waited for something. Today, nothing came.",
    ],
  },
};

export function randomFlavor(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
