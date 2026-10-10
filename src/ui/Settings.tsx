import { useGameStore } from "../engine/store";
import { exportSave, importSave } from "../engine/saves";
import { AccountSection } from "./AccountSection";

interface Props {
  onBack: () => void;
}

export function Settings({ onBack }: Props) {
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const fullState = useGameStore((s) => s);
  const replaceSave = useGameStore((s) => s.replaceSave);

  const handleExport = () => {
    const blob = new Blob([exportSave(fullState)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "storytime-lagos-save.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        replaceSave(importSave(text));
      } catch {
        alert("That save file could not be read.");
      }
    });
  };

  return (
    <div className="settings-screen">
      <header className="settings-screen__header">
        <button className="icon-button" onClick={onBack} aria-label="Back to map">
          ←
        </button>
        <h1>Settings</h1>
      </header>

      <section className="settings-screen__section">
        <h2>Text size</h2>
        <div className="settings-screen__row">
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              className={`choice-button ${settings.textSize === size ? "choice-button--primary" : ""}`}
              onClick={() => updateSettings({ textSize: size })}
            >
              {size}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-screen__section">
        <h2>Accessibility</h2>
        <label className="settings-screen__toggle">
          <input
            type="checkbox"
            checked={settings.relaxedTiming}
            onChange={(e) => updateSettings({ relaxedTiming: e.target.checked })}
          />
          Relaxed timing (no timed choices)
        </label>
        <label className="settings-screen__toggle">
          <input
            type="checkbox"
            checked={settings.pauseBeforeIntense}
            onChange={(e) => updateSettings({ pauseBeforeIntense: e.target.checked })}
          />
          Pause before intense scenes
        </label>
        <label className="settings-screen__toggle">
          <input
            type="checkbox"
            checked={settings.audioOn}
            onChange={(e) => updateSettings({ audioOn: e.target.checked })}
          />
          Ambient audio
        </label>
      </section>

      <section className="settings-screen__section">
        <h2>Account & cloud sync</h2>
        <AccountSection />
      </section>

      <section className="settings-screen__section">
        <h2>Save data</h2>
        <div className="settings-screen__row">
          <button className="choice-button" onClick={handleExport}>
            Export save
          </button>
          <label className="choice-button">
            Import save
            <input type="file" accept="application/json" onChange={handleImport} hidden />
          </label>
        </div>
      </section>
    </div>
  );
}
