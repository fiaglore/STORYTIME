// A client-side word-list check applied to every chat message before it's
// sent — one of the "basic safety rails" for player-to-player chat (see
// CLAUDE.md's "Chat" section for the other three: a send rate limit,
// block, and reporting). This is a first layer, not a complete solution:
// it's a plain substring match against a short list, so it catches overt
// profanity and nothing cleverly misspelled or in another language. It
// also can't be enforced against a client that calls sendChatMessage
// directly, bypassing this UI-layer check entirely — there is no backend
// here to enforce it server-side. Don't present this as "moderated chat"
// to users; it's a deterrent, not a guarantee.
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "whore",
  "slut",
];

const BLOCKED_PATTERN = new RegExp(`\\b(${BLOCKED_WORDS.join("|")})\\b`, "i");

export function containsProfanity(text: string): boolean {
  return BLOCKED_PATTERN.test(text);
}

export const MAX_MESSAGE_LENGTH = 500;
