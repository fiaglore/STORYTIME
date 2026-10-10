import { useEffect, useState } from "react";
import {
  ageUp,
  availableJobs,
  createCharacter,
  pickEvent,
  resolveEvent,
  takeJob,
  type LifeCharacter,
  type JobId,
} from "../engine/lifeSim";
import type { LifeEvent } from "../content/lifeEvents";

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

function persist(character: LifeCharacter | null) {
  try {
    if (character) localStorage.setItem(SAVE_KEY, JSON.stringify(character));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // localStorage unavailable — life sim just won't survive a refresh.
  }
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

  useEffect(() => {
    persist(character);
  }, [character]);

  const startLife = () => {
    setCharacter(createCharacter(nameInput));
    setActiveEvent(null);
  };

  const handleAgeUp = () => {
    if (!character || !character.alive || activeEvent) return;
    const aged = ageUp(character);
    setCharacter(aged);
    if (aged.alive && Math.random() < EVENT_CHANCE) {
      const event = pickEvent(aged);
      if (event) setActiveEvent(event);
    }
  };

  const handleChoice = (index: number) => {
    if (!character || !activeEvent) return;
    setCharacter(resolveEvent(character, activeEvent, index));
    setActiveEvent(null);
  };

  const handleJobPick = (job: JobId) => {
    if (!character) return;
    setCharacter(takeJob(character, job));
    setShowJobs(false);
  };

  const startNewLife = () => {
    setCharacter(null);
    setNameInput("");
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

      <div className="lifesim-stats">
        {STAT_LABELS.map(({ key, label }) => (
          <div className="lifesim-stat" key={key}>
            <div className="lifesim-stat__row">
              <span>{label}</span>
              <span>{character.stats[key]}</span>
            </div>
            <div className="meter__track">
              <div
                className="meter__fill"
                style={{ width: `${character.stats[key]}%`, background: "var(--accent)" }}
              />
            </div>
          </div>
        ))}
        <div className="lifesim-naira">₦{character.stats.naira.toLocaleString()}k naira</div>
      </div>

      <p className="lifesim-job">
        {job ? `Working as a ${job.title}` : "No job yet"}
        {character.age >= 18 && (
          <button className="lifesim-job__button" onClick={() => setShowJobs((s) => !s)}>
            {job ? "Change job" : "Get a job"}
          </button>
        )}
      </p>

      {showJobs && (
        <div className="lifesim-jobs">
          {availableJobs(character).map((j) => (
            <button
              key={j.id}
              className="rpg-choice-pill"
              onClick={() => handleJobPick(j.id)}
            >
              {j.title} — ~₦{j.payPerYear}k/yr
            </button>
          ))}
        </div>
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
            {activeEvent.choices.map((choice, i) => (
              <button
                key={choice.label}
                className="choice-button"
                onClick={() => handleChoice(i)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button className="choice-button choice-button--primary lifesim-age-up" onClick={handleAgeUp}>
          Age up →
        </button>
      )}
    </div>
  );
}
