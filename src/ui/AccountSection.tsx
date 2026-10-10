import { useEffect, useState } from "react";
import { useAuthStore } from "../engine/authStore";

type Mode = "signin" | "signup";

// Shared account widget: a sign-in/sign-up form when signed out, or a
// status + sign-out button when signed in. Used in Settings (story mode)
// and in LifeSim's screen, since both modes' saves sync through the same
// Firebase account once signed in (see store.ts / LifeSim.tsx).
export function AccountSection() {
  const { enabled, status, user, error, busy, init, signIn, signUp, signOut, clearError } =
    useAuthStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  if (!enabled) {
    return (
      <p className="account-section__disabled">
        Cloud save isn't set up for this deployment — progress stays on this device only.
      </p>
    );
  }

  if (status === "loading") {
    return <p className="account-section__disabled">Checking sign-in status…</p>;
  }

  if (status === "signed-in" && user) {
    return (
      <div className="account-section">
        <p className="account-section__status">
          Signed in as <strong>{user.email}</strong> — progress syncs to this account.
        </p>
        <button className="choice-button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") void signIn(email, password);
    else void signUp(email, password);
  };

  return (
    <form className="account-section" onSubmit={submit}>
      <p className="account-section__status">
        Sign in to sync your progress across devices.
      </p>
      <input
        className="lifesim-intro__input"
        type="email"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearError();
        }}
        required
      />
      <input
        className="lifesim-intro__input"
        type="password"
        placeholder="Password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          clearError();
        }}
        required
        minLength={6}
      />
      {error && <p className="account-section__error">{error}</p>}
      <div className="settings-screen__row">
        <button className="choice-button choice-button--primary" type="submit" disabled={busy}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className="choice-button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            clearError();
          }}
        >
          {mode === "signin" ? "Need an account?" : "Have an account?"}
        </button>
      </div>
    </form>
  );
}
