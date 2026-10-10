import { useEffect, useState } from "react";
import { useAuthStore } from "./engine/authStore";
import { TitleScreen } from "./ui/TitleScreen";
import { LifeSim } from "./ui/LifeSim";
import "./app.css";

type Screen = { name: "title" } | { name: "lifesim" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "title" });
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  switch (screen.name) {
    case "title":
      return <TitleScreen onEnterLife={() => setScreen({ name: "lifesim" })} />;

    case "lifesim":
      return <LifeSim onExit={() => setScreen({ name: "title" })} />;

    default:
      return null;
  }
}
