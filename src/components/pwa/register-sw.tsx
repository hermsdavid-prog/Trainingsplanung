"use client";

import { useEffect } from "react";

// The service worker was removed after causing intermittent false
// "offline" pages (stuck registration state across tabs sharing the same
// origin) — a still-active old worker serves its stale cached shell, which
// references JS chunks a newer deployment has since purged, so the
// navigation itself fails ("This page couldn't load"). public/sw.js is a
// kill-switch that self-unregisters browser-side even when this component
// never gets to run because the broken worker intercepted the page load
// before React could mount; this component is the belt-and-suspenders path
// for whenever it does run, also wiping any leftover Cache Storage entries
// and reloading once so the tab is guaranteed to be network-controlled.
export function UnregisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length === 0) return;
      Promise.all(registrations.map((registration) => registration.unregister())).then(() => {
        if ("caches" in window) {
          caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
        }
        if (navigator.serviceWorker.controller) window.location.reload();
      });
    });
  }, []);

  return null;
}
