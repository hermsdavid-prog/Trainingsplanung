"use client";

import { createContext, useContext, useState } from "react";

const CheckinSkipContext = createContext<(() => void) | null>(null);

export function useCheckinSkip() {
  return useContext(CheckinSkipContext);
}

// Wraps the "Wie geht es dir heute?" check-in prompt so tapping "Heute
// überspringen" dismisses it for this page view only. There's no schema
// column to persist a skip flag, so this is deliberately local/session UI
// state — the prompt returns next time the athlete opens the app for as
// long as no check-in has been saved for today.
export function CheckinGate({
  showCheckin,
  checkin,
  main,
}: {
  showCheckin: boolean;
  checkin: React.ReactNode;
  main: React.ReactNode;
}) {
  const [skipped, setSkipped] = useState(false);

  if (showCheckin && !skipped) {
    return <CheckinSkipContext.Provider value={() => setSkipped(true)}>{checkin}</CheckinSkipContext.Provider>;
  }
  return <>{main}</>;
}
