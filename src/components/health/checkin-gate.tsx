"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { todayISO } from "@/lib/date";

const CheckinSkipContext = createContext<(() => void) | null>(null);

export function useCheckinSkip() {
  return useContext(CheckinSkipContext);
}

// "Heute überspringen" is remembered on this device for the rest of the
// day (localStorage), so the prompt doesn't come back after every tab
// switch or after finishing a training. It returns the next day as long as
// no check-in has been saved.
const SKIP_KEY = "checkin-skipped-on";

function readSkippedToday(): boolean {
  try {
    return window.localStorage.getItem(SKIP_KEY) === todayISO();
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function CheckinGate({
  showCheckin,
  checkin,
  main,
}: {
  showCheckin: boolean;
  checkin: React.ReactNode;
  main: React.ReactNode;
}) {
  const skippedStored = useSyncExternalStore(subscribe, readSkippedToday, () => false);
  const [skippedNow, setSkippedNow] = useState(false);

  function skip() {
    setSkippedNow(true);
    try {
      window.localStorage.setItem(SKIP_KEY, todayISO());
    } catch {
      // private mode etc. — skipping still works for this page view
    }
  }

  if (showCheckin && !skippedNow && !skippedStored) {
    return <CheckinSkipContext.Provider value={skip}>{checkin}</CheckinSkipContext.Provider>;
  }
  return <>{main}</>;
}
