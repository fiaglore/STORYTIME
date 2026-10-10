import { useEffect, useRef, useState } from "react";
import {
  ageUp,
  applyDelta,
  availableJobs,
  bandForAge,
  buyItem,
  createCharacter,
  hustle,
  isChoiceAvailable,
  lifeStageForAge,
  meetsAgeUpRequirements,
  pickEvent,
  resolveChore,
  resolveEvent,
  takeJob,
  trainSkill,
  AGE_UP_REQUIREMENTS,
  JOBS,
  MAX_HUSTLES_PER_YEAR,
  type LifeCharacter,
  type JobId,
} from "../engine/lifeSim";
import type { LifeEvent } from "../content/lifeEvents";
import { pickChores, type Chore } from "../content/chores";
import { SHOP_ITEMS, type ShopItem } from "../content/shop";
import { SKILLS, SKILL_TRAIN_COST, type Skill } from "../content/skills";
import { fetchCloudSave, writeCloudSave } from "../engine/firebase";
import { useAuthStore } from "../engine/authStore";
import { AccountSection } from "./AccountSection";
import { latestDelta, useStatDeltas } from "./useStatDeltas";
import { JobInterviewGame, type InterviewResult } from "./JobInterviewGame";

// Realistic one-time bonus/penalty on top of the job itself — see
// lifeEvents.ts's header comment for the real-Naira economy this plugs into.
const INTERVIEW_BONUS: Record<InterviewResult, { naira?: number; happiness?: number }> = {
  great: { naira: 15_000, happiness: 3 },
  good: { naira: 5_000, happiness: 1 },
  miss: { happiness: -2 },
};

// How many small no-choice chores (content/chores.ts) have to be cleared
// each year before Age Up is available — the deliberate, semi-tedious
// daily-grind friction the design asks for. Age bands with no chores in
// the pool (infancy) just get an empty list and Age Up stays immediate.
const CHORES_PER_YEAR = 3;

function formatNaira(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}₦${Math.abs(amount).toLocaleString()}`;
}

interface Props {
  onExit: () => void;
}

const SAVE_KEY = "storytime-lagos:lifesim";

function loadSaved(): LifeCharacter | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as LifeCharacter) : null;
  } catch {
    return null;
  }
}

function persist(character: LifeCharacter | null, uid: string | undefined) {
  try {
    if (character) localStorage.setItem(SAVE_KEY, JSON.stringify(character));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // localStorage unavailable — life sim just won't survive a refresh.
  }
  if (uid) void writeCloudSave(uid, { lifeSim: character });
}

const STAT_LABELS: { key: keyof LifeCharacter["stats"]; label: string; isNaira?: boolean }[] = [
  { key: "happiness", label: "Happiness" },
  { key: "health", label: "Health" },
  { key: "smarts", label: "Smarts" },
  { key: "looks", label: "Looks" },
];

const EVENT_CHANCE = 0.75;

export function LifeSim({ onExit }: Props) {
  const [character, setCharacter] = useState<LifeCharacter | null>(() => loadSaved());
  const [nameInput, setNameInput] = useState("");
  const [activeEvent, setActiveEvent] = useState<LifeEvent | null>(null);
  const [showJobs, setShowJobs] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [pendingJob, setPendingJob] = useState<JobId | null>(null);
  // Not persisted in the save — a reload just rolls a fresh set of chores
  // for the current year rather than remembering which were already done,
  // which is fine for low-stakes busywork like this.
  const [pendingChores, setPendingChores] = useState<Chore[]>(() => {
    const saved = loadSaved();
    return saved && saved.alive ? pickChores(saved, CHORES_PER_YEAR) : [];
  });
  const uid = useAuthStore((s) => s.user?.uid);
  const pulledForUid = useRef<string | null>(null);
  const statEvents = useStatDeltas(character ? { ...character.stats } : {});

  useEffect(() => {
    persist(character, uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  // On sign-in, prefer whatever life is already saved to this account (so
  // switching devices picks up where you left off) over whatever's in this
  // browser's localStorage. Runs once per uid, not on every character edit.
  useEffect(() => {
    if (!uid || pulledForUid.current === uid) return;
    pulledForUid.current = uid;
    void fetchCloudSave(uid).then((cloud) => {
      if (cloud?.lifeSim) setCharacter(cloud.lifeSim as LifeCharacter);
    });
  }, [uid]);

  const startLife = () => {
    const next = createCharacter(nameInput);
    setCharacter(next);
    setActiveEvent(null);
    setPendingChores(pickChores(next, CHORES_PER_YEAR));
  };

  const handleChore = (chore: Chore) => {
    if (!character) return;
    setCharacter(resolveChore(character, chore));
    setPendingChores((cs) => cs.filter((c) => c.id !== chore.id));
  };

  const handleBuy = (item: ShopItem) => {
    if (!character) return;
    setCharacter(buyItem(character, item));
  };

  const handleTrain = (skill: Skill) => {
    if (!character) return;
    setCharacter(trainSkill(character, skill, SKILL_TRAIN_COST));
  };

  const handleHustle = () => {
    if (!character) return;
    setCharacter(hustle(character));
  };

  const handleAgeUp = () => {
    if (
      !character ||
      !character.alive ||
      activeEvent ||
      pendingJob ||
      pendingChores.length > 0 ||
      !meetsAgeUpRequirements(character)
    )
      return;
    const aged = ageUp(character);
    setCharacter(aged);
    if (aged.alive) {
      setPendingChores(pickChores(aged, CHORES_PER_YEAR));
      if (Math.random() < EVENT_CHANCE) {
        const event = pickEvent(aged);
        if (event) setActiveEvent(event);
      }
    }
  };

  const handleChoice = (index: number) => {
    if (!character || !activeEvent) return;
    setCharacter(resolveEvent(character, activeEvent, index));
    setActiveEvent(null);
  };

  const handleJobPick = (job: JobId) => {
    if (!character) return;
    setShowJobs(false);
    setPendingJob(job);
  };

  const handleInterviewComplete = (result: InterviewResult) => {
    if (!character || !pendingJob) return;
    const hired = takeJob(character, pendingJob);
    setCharacter({ ...hired, stats: applyDelta(hired.stats, INTERVIEW_BONUS[result]) });
    setPendingJob(null);
  };

  const startNewLife = () => {
    setCharacter(null);
    setNameInput("");
    setPendingChores([]);
    setShowJobs(false);
    setShowShop(false);
    setShowSkills(false);
  };

  if (!character) {
    return (
      <div className="story-screen">
        <header className="story-screen__header">
          <button className="icon-button" onClick={onExit} aria-label="Back">
            ←
          </button>
          <h1 className="story-screen__title">Lagos Life</h1>
        </header>
        <div className="lifesim-intro">
          <p className="lifesim-intro__tagline">
            Born in Lagos. One life, played year by year — school, hustle, family, and
            whatever the city throws at you.
          </p>
          <label className="lifesim-intro__label" htmlFor="lifesim-name">
            Name your character
          </label>
          <input
            id="lifesim-name"
            className="lifesim-intro__input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="e.g. Chiamaka"
            maxLength={24}
          />
          <button className="choice-button choice-button--primary" onClick={startLife}>
            Begin life
          </button>
        </div>
        <section className="settings-screen__section">
          <h2>Account & cloud sync</h2>
          <AccountSection />
        </section>
      </div>
    );
  }

  if (!character.alive) {
    return (
      <div className="story-screen">
        <header className="story-screen__header">
          <button className="icon-button" onClick={onExit} aria-label="Back">
            ←
          </button>
          <h1 className="story-screen__title">Lagos Life</h1>
        </header>
        <div className="lifesim-obituary">
          <h2>{character.name}</h2>
          <p className="lifesim-obituary__span">Lived to {character.age}</p>
          <p className="lifesim-obituary__cause">{character.deathCause}</p>
          <div className="lifesim-log">
            {character.log.slice(-6).map((line, i) => (
              <p key={i} className="lifesim-log__line">
                {line}
              </p>
            ))}
          </div>
          <button className="choice-button choice-button--primary" onClick={startNewLife}>
            Live a new life
          </button>
        </div>
      </div>
    );
  }

  const job = availableJobs(character).find((j) => j.id === character.job);

  return (
    <div className="story-screen">
      <header className="story-screen__header">
        <button className="icon-button" onClick={onExit} aria-label="Back">
          ←
        </button>
        <h1 className="story-screen__title">
          {character.name} · Age {character.age}
        </h1>
      </header>

      {(() => {
        const stage = lifeStageForAge(character.age);
        const span = stage.endAge - stage.startAge || 1;
        const progress = Math.min(100, Math.max(0, ((character.age - stage.startAge) / span) * 100));
        return (
          <div className="lifesim-stage">
            <div className="lifesim-stage__row">
              <span className="lifesim-stage__badge">
                {stage.icon} {stage.name}
              </span>
              {character.streak > 1 && (
                <span className="lifesim-streak">🔥 {character.streak}-year streak</span>
              )}
            </div>
            <div className="meter__track">
              <div
                className="meter__fill"
                style={{ width: `${progress}%`, background: "var(--chapter-accent, var(--accent))" }}
              />
            </div>
          </div>
        );
      })()}

      <div className="lifesim-stats">
        {STAT_LABELS.map(({ key, label }) => {
          const delta = latestDelta(statEvents, key);
          return (
            <div className="lifesim-stat" key={key}>
              <div className="lifesim-stat__row">
                <span>{label}</span>
                <span className="meter__value">
                  {character.stats[key]}
                  {delta != null && (
                    <span
                      key={`${delta}-${character.stats[key]}`}
                      className={`meter__popup ${delta > 0 ? "meter__popup--up" : "meter__popup--down"}`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </span>
              </div>
              <div className={`meter__track ${delta != null ? "meter__track--flash" : ""}`}>
                <div
                  className="meter__fill"
                  style={{ width: `${character.stats[key]}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
          );
        })}
        <div className="lifesim-naira">
          <span className="lifesim-naira__value">
            ₦{character.stats.naira.toLocaleString()}
            {latestDelta(statEvents, "naira") != null && (
              <span
                key={`naira-${latestDelta(statEvents, "naira")}-${character.stats.naira}`}
                className={`meter__popup ${
                  latestDelta(statEvents, "naira")! > 0 ? "meter__popup--up" : "meter__popup--down"
                }`}
              >
                {formatNaira(latestDelta(statEvents, "naira")!)}
              </span>
            )}
          </span>
        </div>
      </div>

      <p className="lifesim-job">{job ? `Working as a ${job.title}` : "No job yet"}</p>

      <div className="lifesim-tabs">
        {character.age >= 18 && (
          <button
            className={`lifesim-tab ${showJobs ? "lifesim-tab--active" : ""}`}
            onClick={() => {
              setShowJobs((s) => !s);
              setShowShop(false);
              setShowSkills(false);
            }}
          >
            {job ? "Change job" : "Get a job"}
          </button>
        )}
        <button
          className={`lifesim-tab ${showShop ? "lifesim-tab--active" : ""}`}
          onClick={() => {
            setShowShop((s) => !s);
            setShowJobs(false);
            setShowSkills(false);
          }}
        >
          Shop
        </button>
        <button
          className={`lifesim-tab ${showSkills ? "lifesim-tab--active" : ""}`}
          onClick={() => {
            setShowSkills((s) => !s);
            setShowJobs(false);
            setShowShop(false);
          }}
        >
          Skills
        </button>
      </div>

      {showJobs && !pendingJob && (
        <div className="lifesim-jobs">
          {availableJobs(character).map((j) => (
            <button
              key={j.id}
              className="rpg-choice-pill"
              onClick={() => handleJobPick(j.id)}
            >
              {j.title} — ~₦{j.payPerYear.toLocaleString()}/yr
            </button>
          ))}
          {availableJobs(character).every((j) => j.id === "hawker") && (
            <p className="lifesim-hint">Train a skill to unlock better-paying work.</p>
          )}
        </div>
      )}

      {showShop && (
        <div className="lifesim-shop">
          {SHOP_ITEMS.map((item) => {
            const owned = character.inventory.includes(item.id);
            const afford = character.stats.naira >= item.price;
            return (
              <div key={item.id} className="lifesim-shop__item">
                <div className="lifesim-shop__info">
                  <span className="lifesim-shop__name">{item.name}</span>
                  <span className="lifesim-shop__desc">{item.description}</span>
                </div>
                <button
                  className="rpg-choice-pill lifesim-shop__buy"
                  onClick={() => handleBuy(item)}
                  disabled={owned || !afford}
                >
                  {owned ? "Owned" : `₦${item.price.toLocaleString()}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showSkills && (
        <div className="lifesim-skills">
          {SKILLS.map((skill) => {
            const level = character.skills[skill.id] ?? 0;
            const afford = character.stats.naira >= SKILL_TRAIN_COST;
            return (
              <div key={skill.id} className="lifesim-skill">
                <div className="lifesim-skill__row">
                  <span className="lifesim-skill__name">{skill.name}</span>
                  <span className="meter__value">{level}</span>
                </div>
                <div className="meter__track">
                  <div className="meter__fill" style={{ width: `${level}%`, background: "var(--accent)" }} />
                </div>
                <button
                  className="rpg-choice-pill lifesim-skill__train"
                  onClick={() => handleTrain(skill)}
                  disabled={!afford || level >= 100}
                >
                  {level >= 100 ? "Maxed" : `Practice — ₦${SKILL_TRAIN_COST.toLocaleString()}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pendingJob && (
        <JobInterviewGame
          jobTitle={JOBS.find((j) => j.id === pendingJob)?.title ?? "the job"}
          onComplete={handleInterviewComplete}
        />
      )}

      <div className="lifesim-log">
        {character.log.slice(-4).map((line, i) => (
          <p key={i} className="lifesim-log__line">
            {line}
          </p>
        ))}
      </div>

      {activeEvent ? (
        <div className="lifesim-event">
          <p className="lifesim-event__prompt">{activeEvent.prompt}</p>
          <div className="story-screen__choices">
            {activeEvent.choices.map((choice, i) => {
              // Choices gated behind an asset you don't own yet or naira
              // you haven't saved up just aren't offered — see
              // isChoiceAvailable / lifeEvents.ts's requiresAsset and
              // requiresNaira for the "very difficult challenge" gates.
              if (!isChoiceAvailable(character, choice)) return null;
              return (
                <button
                  key={choice.label}
                  className="choice-button"
                  onClick={() => handleChoice(i)}
                >
                  {choice.label}
                  {choice.delta.naira ? (
                    <span className="choice-button__cost">{formatNaira(choice.delta.naira)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : pendingChores.length > 0 ? (
        <div className="lifesim-chore">
          <p className="lifesim-chore__counter">
            Before you can age up — {pendingChores.length} thing{pendingChores.length > 1 ? "s" : ""} left today
          </p>
          <p className="lifesim-chore__text">{pendingChores[0].text}</p>
          <button className="choice-button choice-button--primary" onClick={() => handleChore(pendingChores[0])}>
            Done
          </button>
        </div>
      ) : !meetsAgeUpRequirements(character) ? (
        (() => {
          const req = AGE_UP_REQUIREMENTS[bandForAge(character.age)];
          return (
            <div className="lifesim-requirement">
              <p className="lifesim-requirement__counter">Before you can age up</p>
              <div className="lifesim-requirement__row">
                <span>Earned ₦{character.earnedThisYear.toLocaleString()} / ₦{req.minEarn.toLocaleString()}</span>
                <div className="meter__track">
                  <div
                    className="meter__fill"
                    style={{
                      width: `${Math.min(100, (character.earnedThisYear / req.minEarn) * 100)}%`,
                      background: "var(--naira)",
                    }}
                  />
                </div>
              </div>
              <div className="lifesim-requirement__row">
                <span>Spent ₦{character.spentThisYear.toLocaleString()} / ₦{req.minSpend.toLocaleString()}</span>
                <div className="meter__track">
                  <div
                    className="meter__fill"
                    style={{
                      width: `${Math.min(100, (character.spentThisYear / req.minSpend) * 100)}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>
              <button
                className="choice-button"
                onClick={handleHustle}
                disabled={character.hustlesThisYear >= MAX_HUSTLES_PER_YEAR}
              >
                {character.hustlesThisYear >= MAX_HUSTLES_PER_YEAR
                  ? "No more hustle left in you this year"
                  : `Hustle for quick cash (${MAX_HUSTLES_PER_YEAR - character.hustlesThisYear} left)`}
              </button>
              <p className="lifesim-hint">Short on spend? The Shop always has something cheap.</p>
            </div>
          );
        })()
      ) : (
        !pendingJob && (
          <button className="choice-button choice-button--primary lifesim-age-up" onClick={handleAgeUp}>
            Age up →
          </button>
        )
      )}
    </div>
  );
}
