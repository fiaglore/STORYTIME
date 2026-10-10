import { useEffect, useRef, useState } from "react";
import {
  blockPlayer,
  marry,
  maxSendable,
  receiveMoney,
  sendMoney,
  type LifeCharacter,
} from "../engine/lifeSim";
import {
  chatIdFor,
  claimMoneyTransfer,
  clearLifeSimPresence,
  proposeMarriage,
  reportMessage,
  respondToProposal,
  sendChatMessage,
  sendMoneyTransfer,
  watchChatMessages,
  watchIncomingProposals,
  watchIncomingTransfers,
  watchLifeSimPresence,
  watchOutgoingProposals,
  writeLifeSimPresence,
  type ChatMessageDoc,
  type LifeSimPresenceDoc,
  type MarriageProposalDoc,
  type MoneyTransferDoc,
} from "../engine/firebase";
import { containsProfanity, MAX_MESSAGE_LENGTH } from "../engine/profanityFilter";

interface Props {
  character: LifeCharacter;
  uid: string;
  onUpdateCharacter: (next: LifeCharacter) => void;
}

const PRESENCE_INTERVAL_MS = 10_000;
const CHAT_RATE_LIMIT_MS = 2_000;

// Real player-to-player marriage and free-text chat for Lagos Life, split
// out of LifeSim.tsx to keep that file from growing unmanageable. Both
// features are only meaningful once signed in (uid is required by the
// parent before this even mounts) — see CLAUDE.md's "Marriage" and
// "Chat" sections for the full design: why neither side writes the
// other's save document, the chatId convention, and the four safety
// rails (profanity filter, rate limit, block, report).
export function LifeSimSocial({ character, uid, onUpdateCharacter }: Props) {
  const [nearbyPlayers, setNearbyPlayers] = useState<LifeSimPresenceDoc[]>([]);
  const [incomingProposals, setIncomingProposals] = useState<MarriageProposalDoc[]>([]);
  const [outgoingProposals, setOutgoingProposals] = useState<MarriageProposalDoc[]>([]);
  const [activeChat, setActiveChat] = useState<{ uid: string; name: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageDoc[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const lastSentAt = useRef(0);
  const marriedFromProposal = useRef<string | null>(null);
  const [incomingTransfers, setIncomingTransfers] = useState<MoneyTransferDoc[]>([]);
  const claimedTransferIds = useRef<Set<string>>(new Set());
  const [sendTarget, setSendTarget] = useState<{ uid: string; name: string } | null>(null);
  const [sendAmount, setSendAmount] = useState("");

  // Broadcast this player's own lifesim presence (character name + age)
  // so other players can see them in the nearby-players list.
  useEffect(() => {
    if (!character.alive) return;
    const broadcast = () =>
      void writeLifeSimPresence(uid, { characterName: character.name, age: character.age }).catch(() => {});
    broadcast();
    const interval = window.setInterval(broadcast, PRESENCE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [uid, character.name, character.age, character.alive]);

  useEffect(() => {
    return () => void clearLifeSimPresence(uid).catch(() => {});
  }, [uid]);

  useEffect(() => watchLifeSimPresence(uid, setNearbyPlayers), [uid]);
  useEffect(() => watchIncomingProposals(uid, setIncomingProposals), [uid]);
  useEffect(() => watchOutgoingProposals(uid, setOutgoingProposals), [uid]);
  useEffect(() => watchIncomingTransfers(uid, setIncomingTransfers), [uid]);

  // Credit each unclaimed transfer exactly once — claimedTransferIds guards
  // against re-applying one between the moment we credit it locally and
  // the moment claimMoneyTransfer's write is actually confirmed back by
  // the next snapshot (same race the marriage proposal effect below
  // guards against with marriedFromProposal).
  useEffect(() => {
    const unclaimed = incomingTransfers.filter((t) => !claimedTransferIds.current.has(t.id));
    if (unclaimed.length === 0) return;
    let next = character;
    for (const transfer of unclaimed) {
      claimedTransferIds.current.add(transfer.id);
      next = receiveMoney(next, transfer.amount, transfer.fromName);
      void claimMoneyTransfer(transfer.id).catch(() => {});
    }
    onUpdateCharacter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingTransfers]);

  // The moment either side's own view of a proposal they're party to
  // flips to "accepted", marry locally and persist — independently of
  // whichever client actually clicked Accept. marriedFromProposal guards
  // against re-running this for the same proposal after spouseUid is set
  // (character.spouseUid itself isn't enough of a guard inside this
  // effect's closure across the single render where both update).
  useEffect(() => {
    if (character.spouseUid) return;
    const accepted = [...incomingProposals, ...outgoingProposals].find(
      (p) => p.status === "accepted" && p.id !== marriedFromProposal.current,
    );
    if (!accepted) return;
    marriedFromProposal.current = accepted.id;
    const spouseUid = accepted.fromUid === uid ? accepted.toUid : accepted.fromUid;
    const spouseName = accepted.fromUid === uid ? accepted.toName : accepted.fromName;
    onUpdateCharacter(marry(character, spouseUid, spouseName));
  }, [incomingProposals, outgoingProposals, character, uid, onUpdateCharacter]);

  // No reset-to-[] when activeChat closes: the render below only reads
  // chatMessages while activeChat is truthy, and re-subscribing on the
  // next open always delivers a fresh snapshot anyway.
  useEffect(() => {
    if (!activeChat) return;
    return watchChatMessages(uid, activeChat.uid, setChatMessages);
  }, [uid, activeChat]);

  const blockedUids = character.blockedUids;
  const visibleNearby = nearbyPlayers.filter((p) => !blockedUids.includes(p.uid) && p.uid !== character.spouseUid);
  const pendingOutgoingUids = new Set(outgoingProposals.filter((p) => p.status === "pending").map((p) => p.toUid));
  const pendingIncoming = incomingProposals.filter((p) => p.status === "pending" && !blockedUids.includes(p.fromUid));

  const handlePropose = (player: LifeSimPresenceDoc) => {
    void proposeMarriage(uid, character.name, player.uid, player.characterName).catch(() => {});
  };

  const handleRespond = (proposal: MarriageProposalDoc, accept: boolean) => {
    void respondToProposal(proposal.id, accept).catch(() => {});
  };

  const openChat = (otherUid: string, otherName: string) => {
    setActiveChat({ uid: otherUid, name: otherName });
    setChatError(null);
  };

  const openSend = (otherUid: string, otherName: string) => {
    setSendTarget({ uid: otherUid, name: otherName });
    setSendAmount("");
  };

  const handleSendMoney = () => {
    if (!sendTarget) return;
    const amount = Math.floor(Number(sendAmount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > maxSendable(character)) return;
    onUpdateCharacter(sendMoney(character, amount));
    void sendMoneyTransfer(uid, character.name, sendTarget.uid, sendTarget.name, amount).catch(() => {});
    setSendTarget(null);
    setSendAmount("");
  };

  const handleSend = () => {
    if (!activeChat) return;
    const text = chatInput.trim();
    if (!text) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setChatError(`Keep it under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    if (containsProfanity(text)) {
      setChatError("Let's keep it clean — try rephrasing.");
      return;
    }
    const now = Date.now();
    if (now - lastSentAt.current < CHAT_RATE_LIMIT_MS) {
      setChatError("Slow down a little.");
      return;
    }
    lastSentAt.current = now;
    setChatError(null);
    setChatInput("");
    void sendChatMessage(uid, activeChat.uid, text).catch(() => setChatError("Couldn't send — try again."));
  };

  const handleBlock = (otherUid: string) => {
    onUpdateCharacter(blockPlayer(character, otherUid));
    if (activeChat?.uid === otherUid) setActiveChat(null);
  };

  const handleReport = (otherUid: string, text: string) => {
    void reportMessage(uid, otherUid, chatIdFor(uid, otherUid), text).catch(() => {});
  };

  if (sendTarget) {
    return (
      <div className="lifesim-send-money">
        <div className="lifesim-chat__header">
          <button className="icon-button" onClick={() => setSendTarget(null)} aria-label="Back">
            ←
          </button>
          <span className="lifesim-chat__name">Send money to {sendTarget.name}</span>
        </div>
        <p className="lifesim-hint">
          You have ₦{character.stats.naira.toLocaleString()}. You can send up to ₦
          {maxSendable(character).toLocaleString()} right now — no more than 20% of your net worth every 5 years.
        </p>
        <input
          className="lifesim-intro__input"
          type="number"
          min={1}
          max={maxSendable(character)}
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
          placeholder="Amount in naira"
        />
        <button
          className="choice-button choice-button--primary"
          disabled={
            !sendAmount ||
            !Number.isFinite(Number(sendAmount)) ||
            Number(sendAmount) <= 0 ||
            Number(sendAmount) > maxSendable(character)
          }
          onClick={handleSendMoney}
        >
          Send
        </button>
      </div>
    );
  }

  if (activeChat) {
    const visibleMessages = chatMessages.filter((m) => !blockedUids.includes(m.fromUid));
    return (
      <div className="lifesim-chat">
        <div className="lifesim-chat__header">
          <button className="icon-button" onClick={() => setActiveChat(null)} aria-label="Back">
            ←
          </button>
          <span className="lifesim-chat__name">{activeChat.name}</span>
          <button className="lifesim-chat__block" onClick={() => handleBlock(activeChat.uid)}>
            Block
          </button>
        </div>
        <div className="lifesim-chat__messages">
          {visibleMessages.length === 0 && <p className="lifesim-hint">No messages yet — say hello.</p>}
          {visibleMessages.map((m) => (
            <div
              key={m.id}
              className={`lifesim-chat__bubble ${m.fromUid === uid ? "lifesim-chat__bubble--mine" : ""}`}
            >
              <p>{m.text}</p>
              {m.fromUid !== uid && (
                <button className="lifesim-chat__report" onClick={() => handleReport(m.fromUid, m.text)}>
                  Report
                </button>
              )}
            </div>
          ))}
        </div>
        {chatError && <p className="lifesim-chat__error">{chatError}</p>}
        <div className="lifesim-chat__compose">
          <input
            className="lifesim-chat__input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <button className="choice-button choice-button--primary" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lifesim-marriage">
      {character.spouseUid ? (
        <div className="lifesim-marriage__spouse">
          <p>💍 Married to {character.spouseName}</p>
          <div className="lifesim-marriage__player-actions">
            <button
              className="rpg-choice-pill"
              onClick={() => openChat(character.spouseUid!, character.spouseName ?? "Spouse")}
            >
              Message {character.spouseName}
            </button>
            <button
              className="rpg-choice-pill"
              onClick={() => openSend(character.spouseUid!, character.spouseName ?? "Spouse")}
            >
              Send money
            </button>
          </div>
        </div>
      ) : (
        <>
          {pendingIncoming.length > 0 && (
            <div className="lifesim-marriage__proposals">
              {pendingIncoming.map((p) => (
                <div key={p.id} className="lifesim-marriage__proposal">
                  <span>{p.fromName} proposed to you</span>
                  <div className="lifesim-marriage__proposal-actions">
                    <button className="rpg-choice-pill" onClick={() => handleRespond(p, true)}>
                      Accept
                    </button>
                    <button className="rpg-choice-pill" onClick={() => handleRespond(p, false)}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {visibleNearby.length === 0 ? (
            <p className="lifesim-hint">Nobody else is playing Lagos Life right now — check back later.</p>
          ) : (
            visibleNearby.map((p) => (
              <div key={p.uid} className="lifesim-marriage__player">
                <span>
                  {p.characterName} · Age {p.age}
                </span>
                <div className="lifesim-marriage__player-actions">
                  <button className="rpg-choice-pill" onClick={() => openChat(p.uid, p.characterName)}>
                    Message
                  </button>
                  <button
                    className="rpg-choice-pill"
                    onClick={() => handlePropose(p)}
                    disabled={pendingOutgoingUids.has(p.uid)}
                  >
                    {pendingOutgoingUids.has(p.uid) ? "Proposed" : "Propose"}
                  </button>
                  <button className="rpg-choice-pill" onClick={() => openSend(p.uid, p.characterName)}>
                    Send money
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
