import { useEffect, useState } from "react";
import { unblockPlayer, type LifeCharacter } from "../engine/lifeSim";
import { FAITHS, type FaithId } from "../content/characterCreation";
import { AccountSection } from "./AccountSection";

type ThemeChoice = "system" | "light" | "dark";

const THEME_KEY = "storytime-lagos:theme";

function loadTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === "light" || raw === "dark" ? raw : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: ThemeChoice) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

interface Props {
  character: LifeCharacter;
  onUpdateCharacter: (next: LifeCharacter) => void;
  onChangeFaith: (faith: FaithId) => void;
  onResetCharacter: () => void;
}

// Lagos Life's settings panel — one of the tabs in LifeSim.tsx, alongside
// Shop/Skills/Marriage. Rebuilt from scratch for this game mode (the old
// Settings.tsx was entirely coupled to the removed story mode's Zustand
// store and save-file export/import — see CLAUDE.md's history note if
// that ever needs resurrecting as a separate project's concern, not
// this repo's).
export function Settings({ character, onUpdateCharacter, onChangeFaith, onResetCharacter }: Props) {
  const [theme, setTheme] = useState<ThemeChoice>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage unavailable — theme choice just won't survive a reload.
    }
  }, [theme]);

  const handleUnblock = (otherUid: string) => {
    onUpdateCharacter(unblockPlayer(character, otherUid));
  };

  return (
    <div className="lifesim-settings">
      <section className="settings-screen__section">
        <h2>Theme</h2>
        <div className="settings-screen__row">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              className={`choice-button ${theme === t ? "choice-button--primary" : ""}`}
              onClick={() => setTheme(t)}
            >
              {t === "system" ? "Match device" : t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-screen__section">
        <h2>Faith</h2>
        <div className="settings-screen__row">
          {FAITHS.map((f) => (
            <button
              key={f.id}
              className={`choice-button ${character.faith === f.id ? "choice-button--primary" : ""}`}
              onClick={() => onChangeFaith(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-screen__section">
        <h2>Account & cloud sync</h2>
        <AccountSection />
      </section>

      {character.blockedUids.length > 0 && (
        <section className="settings-screen__section">
          <h2>Blocked players</h2>
          <div className="settings-screen__row">
            {character.blockedUids.map((uid) => (
              <button key={uid} className="choice-button" onClick={() => handleUnblock(uid)}>
                Unblock {uid.slice(0, 6)}…
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="settings-screen__section">
        <h2>Danger zone</h2>
        <button
          className="choice-button"
          onClick={() => {
            if (confirm(`Give up on ${character.name}'s life and start a brand new one?`)) onResetCharacter();
          }}
        >
          Start a new life
        </button>
      </section>
    </div>
  );
}
