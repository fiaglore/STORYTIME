import { describe, expect, it } from "vitest";
import { containsProfanity } from "../src/engine/profanityFilter";

describe("containsProfanity", () => {
  it("flags an obvious blocked word on its own", () => {
    expect(containsProfanity("shit")).toBe(true);
  });

  it("flags a blocked word inside an ordinary sentence", () => {
    expect(containsProfanity("you are a bastard honestly")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(containsProfanity("SHIT happens")).toBe(true);
  });

  it("doesn't flag ordinary conversation", () => {
    expect(containsProfanity("hello, how far? lagos traffic no dey carry last")).toBe(false);
  });

  it("doesn't false-positive on a word that merely contains a blocked substring", () => {
    // "assholeish" isn't a real example, but this guards the \b word-boundary
    // behavior: "class" contains no blocked word as a whole word.
    expect(containsProfanity("I'm heading to class now")).toBe(false);
  });
});
