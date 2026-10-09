import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const storyPath = join(here, "..", "src", "content", "compiled", "01-the-grind.json");
const storyJson = JSON.parse(readFileSync(storyPath, "utf8"));

function freshStory() {
  return new Story(storyJson);
}

// Ink attaches tags to whichever output line they directly precede, which
// is not necessarily the last line before a choice point — so every line's
// tags must be inspected as it streams past, not just the final one.
function runToChoicesCollectingTags(story: Story): string[] {
  const allTags: string[] = [];
  while (story.canContinue) {
    story.Continue();
    allTags.push(...(story.currentTags ?? []));
  }
  return allTags;
}

function playUntilEnding(
  story: Story,
  pickChoice: (choices: { text: string; index: number }[]) => number,
) {
  let endingId: string | null = null;
  // Safety cap in case a branch loops unexpectedly.
  for (let i = 0; i < 100; i++) {
    const tags = runToChoicesCollectingTags(story);
    const endingTag = tags.find((t) => t.startsWith("ending_id:"));
    if (endingTag) {
      endingId = endingTag.split(":")[1].trim();
      break;
    }
    if (story.currentChoices.length === 0) break;
    const choices = story.currentChoices.map((c, index) => ({ text: c.text, index }));
    const idx = pickChoice(choices);
    story.ChooseChoiceIndex(idx);
  }
  return endingId;
}

describe("The Grind — chapter 1 ink script", () => {
  it("compiles and starts with naira=50, spirit=60", () => {
    const story = freshStory();
    runToChoicesCollectingTags(story);
    expect(story.variablesState.$("naira")).toBe(50);
    expect(story.variablesState.$("spirit")).toBe(60);
  });

  it("reaches the As Written ending when the player stands on dignity", () => {
    const story = freshStory();
    const ending = playUntilEnding(story, (choices) => {
      const standFirm = choices.find((c) => c.text.includes("Stand on your dignity"));
      return standFirm ? standFirm.index : 0;
    });
    expect(ending).toBe("as_written");
  });

  it("reaches Paid in Full when the player always pays", () => {
    const story = freshStory();
    const ending = playUntilEnding(story, (choices) => {
      const pay = choices.find((c) => c.text.startsWith("Pay the"));
      return pay ? pay.index : 0;
    });
    expect(ending).toBe("paid_in_full");
  });

  it("reaches Mile 12 when the player leaves before confrontation", () => {
    const story = freshStory();
    const ending = playUntilEnding(story, (choices) => {
      const leave = choices.find((c) => c.text.includes("Mile 12"));
      return leave ? leave.index : 0;
    });
    expect(ending).toBe("mile_12");
  });

  it("reaches The Market Stands when solidarity is built with all three traders", () => {
    const story = freshStory();
    const ending = playUntilEnding(story, (choices) => {
      const solidarityChoice = choices.find(
        (c) =>
          c.text.includes("Stand beside Baba Issa") ||
          c.text.includes("Lend Aisha") ||
          c.text.includes("Walk over and stand with him") ||
          c.text.includes("Call the traders to stand with you"),
      );
      return solidarityChoice ? solidarityChoice.index : 0;
    });
    expect(ending).toBe("market_stands");
  });
});
