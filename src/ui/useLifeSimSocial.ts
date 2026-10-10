import { useEffect, useRef, useState } from "react";
import { marry, receiveMoney, type LifeCharacter } from "../engine/lifeSim";
import {
  claimMoneyTransfer,
  clearLifeSimPresence,
  watchIncomingProposals,
  watchIncomingTransfers,
  watchLifeSimPresence,
  watchOutgoingProposals,
  writeLifeSimPresence,
  type LifeSimPresenceDoc,
  type MarriageProposalDoc,
  type MoneyTransferDoc,
} from "../engine/firebase";

const PRESENCE_INTERVAL_MS = 10_000;

// Lagos Life's real player-to-player features (see CLAUDE.md's "Marriage"
// section) only make sense once signed in and an adult — the Marriage tab
// itself is gated the same way in LifeSim.tsx, and must stay in sync with
// this constant.
export const MIN_SOCIAL_AGE = 18;

export interface LifeSimSocialState {
  nearbyPlayers: LifeSimPresenceDoc[];
  incomingProposals: MarriageProposalDoc[];
  outgoingProposals: MarriageProposalDoc[];
}

// Presence broadcasting, the nearby-players/proposal/money-transfer
// listeners, and the two effects that act on them without any click from
// this player (auto-marry once a proposal is accepted, auto-credit once a
// money transfer is claimed) used to live entirely inside
// LifeSimSocial.tsx — meaning all of it only ran while the Marriage tab
// happened to be mounted. That was a real bug with two separate symptoms:
//   1. A proposal accepted, or money sent, while this player had any
//      other tab open (Shop, Skills, even just the main screen) sat
//      unprocessed until they next opened Marriage — spouseUid/naira
//      didn't update in the background the way the design intends.
//   2. Presence itself only existed while that one panel was mounted, so
//      two players who were both genuinely online at the same time
//      wouldn't see each other in the nearby-players list unless both
//      happened to have the Marriage tab open at that exact moment —
//      the entire "see other players" feature was far emptier than the
//      number of actual concurrent players would suggest.
// Lifted up here so LifeSim.tsx can run this hook unconditionally
// (whenever a signed-in adult character exists) instead of only while a
// specific UI panel is showing. LifeSimSocial.tsx keeps only what's
// genuinely tab-scoped — the open chat thread, the send-money form — and
// the user-initiated action handlers (propose, respond, send, chat,
// block, report), reading nearbyPlayers/incomingProposals/
// outgoingProposals from this hook's return value as props instead of
// owning its own copies.
export function useLifeSimSocial(
  uid: string | undefined,
  character: LifeCharacter | null,
  onUpdateCharacter: (next: LifeCharacter) => void,
): LifeSimSocialState {
  const [nearbyPlayers, setNearbyPlayers] = useState<LifeSimPresenceDoc[]>([]);
  const [incomingProposals, setIncomingProposals] = useState<MarriageProposalDoc[]>([]);
  const [outgoingProposals, setOutgoingProposals] = useState<MarriageProposalDoc[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<MoneyTransferDoc[]>([]);
  const claimedTransferIds = useRef<Set<string>>(new Set());
  const marriedFromProposal = useRef<string | null>(null);

  const eligible = Boolean(uid && character && character.alive && character.age >= MIN_SOCIAL_AGE);
  const name = character?.name;
  const age = character?.age;

  // Broadcast this player's own lifesim presence (character name + age)
  // so other players can see them in the nearby-players list — for as
  // long as they're a signed-in, alive, marriage-eligible adult, not just
  // while they happen to be looking at the Marriage tab.
  useEffect(() => {
    if (!uid || !eligible || !name) return;
    const broadcast = () =>
      void writeLifeSimPresence(uid, { characterName: name, age: age ?? 0 }).catch(() => {});
    broadcast();
    const interval = window.setInterval(broadcast, PRESENCE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [uid, eligible, name, age]);

  useEffect(() => {
    if (!uid) return;
    return () => void clearLifeSimPresence(uid).catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!uid || !eligible) return;
    return watchLifeSimPresence(uid, setNearbyPlayers);
  }, [uid, eligible]);

  useEffect(() => {
    if (!uid || !eligible) return;
    return watchIncomingProposals(uid, setIncomingProposals);
  }, [uid, eligible]);

  useEffect(() => {
    if (!uid || !eligible) return;
    return watchOutgoingProposals(uid, setOutgoingProposals);
  }, [uid, eligible]);

  useEffect(() => {
    if (!uid || !eligible) return;
    return watchIncomingTransfers(uid, setIncomingTransfers);
  }, [uid, eligible]);

  // Claim first, credit only on a won claim — claimMoneyTransfer is an
  // atomic Firestore transaction that flips claimed only if it's still
  // false and reports whether this call was the one that did it (see
  // firebase.ts for the duplication bug this fixed). claimedTransferIds
  // guards against this effect re-entering the same transfer while a
  // claim for it is already in flight (a new snapshot can arrive
  // mid-await); a transfer whose claim attempt throws (offline, etc.) is
  // un-marked so a later snapshot retries it, but one that resolves false
  // (genuinely already claimed elsewhere) is never retried or credited.
  useEffect(() => {
    if (!character) return;
    const unclaimed = incomingTransfers.filter((t) => !claimedTransferIds.current.has(t.id));
    if (unclaimed.length === 0) return;
    let cancelled = false;
    void (async () => {
      let next = character;
      for (const transfer of unclaimed) {
        if (cancelled) return;
        claimedTransferIds.current.add(transfer.id);
        let won: boolean;
        try {
          won = await claimMoneyTransfer(transfer.id);
        } catch {
          claimedTransferIds.current.delete(transfer.id);
          continue;
        }
        if (!won || cancelled) continue;
        next = receiveMoney(next, transfer.amount, transfer.fromName);
        onUpdateCharacter(next);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingTransfers]);

  // The moment either side's own view of a proposal they're party to
  // flips to "accepted", marry locally and persist — independently of
  // whichever client actually clicked Accept, and regardless of which
  // tab either player currently has open. marriedFromProposal guards
  // against re-running this for the same proposal after spouseUid is set
  // (character.spouseUid itself isn't enough of a guard inside this
  // effect's closure across the single render where both update).
  useEffect(() => {
    if (!character || character.spouseUid || !uid) return;
    const accepted = [...incomingProposals, ...outgoingProposals].find(
      (p) => p.status === "accepted" && p.id !== marriedFromProposal.current,
    );
    if (!accepted) return;
    marriedFromProposal.current = accepted.id;
    const spouseUid = accepted.fromUid === uid ? accepted.toUid : accepted.fromUid;
    const spouseName = accepted.fromUid === uid ? accepted.toName : accepted.fromName;
    onUpdateCharacter(marry(character, spouseUid, spouseName));
  }, [incomingProposals, outgoingProposals, character, uid, onUpdateCharacter]);

  return { nearbyPlayers, incomingProposals, outgoingProposals };
}
