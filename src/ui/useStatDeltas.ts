import { useEffect, useRef, useState } from "react";

export interface StatDeltaEvent {
  id: number;
  key: string;
  delta: number;
}

let nextId = 0;
const POPUP_LIFETIME_MS = 1100;

// Diffs a {key: value} map against its previous render and returns a
// short-lived list of per-key deltas, each clearing itself after
// POPUP_LIFETIME_MS. Used to drive floating "+2"/"-3" popups next to
// meters/stats without each caller re-implementing the diff/timeout dance.
export function useStatDeltas(values: Record<string, number>): StatDeltaEvent[] {
  const prevRef = useRef<Record<string, number> | null>(null);
  const [events, setEvents] = useState<StatDeltaEvent[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = values;
    if (!prev) return;
    const changed: StatDeltaEvent[] = [];
    for (const key of Object.keys(values)) {
      const delta = values[key] - (prev[key] ?? values[key]);
      if (delta !== 0) changed.push({ id: nextId++, key, delta });
    }
    if (changed.length === 0) return;
    setEvents((cur) => [...cur, ...changed]);
    const ids = new Set(changed.map((e) => e.id));
    const timer = window.setTimeout(() => {
      setEvents((cur) => cur.filter((e) => !ids.has(e.id)));
    }, POPUP_LIFETIME_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  return events;
}

export function latestDelta(events: StatDeltaEvent[], key: string): number | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].key === key) return events[i].delta;
  }
  return undefined;
}
