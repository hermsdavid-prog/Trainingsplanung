"use client";

import { useEffect } from "react";

// The service worker was removed after causing intermittent false
// "offline" pages (stuck registration state across tabs sharing the same
// origin). This actively cleans up any previously-installed worker from
// earlier testing so nobody stays stuck on it.
export function UnregisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }, []);

  return null;
}
