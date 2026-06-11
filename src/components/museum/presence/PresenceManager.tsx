"use client";

import { useEffect } from "react";
import type { PresenceClient } from "./client";

// Mounts presence after the room has loaded (SPEC 12.2): ?net=off loads
// nothing, ?net=local uses the BroadcastChannel reference transport, the
// default lazy-imports the webrtc chunk and degrades silently to off.
export default function PresenceManager({ loaded }: { loaded: boolean }) {
  useEffect(() => {
    if (!loaded) return;
    const hud = document.getElementById("museum-hud");
    if (!hud) return;
    const mode = new URLSearchParams(window.location.search).get("net");
    if (mode === "off") {
      hud.setAttribute("data-net", "off");
      return;
    }

    let stopped = false;
    let client: PresenceClient | null = null;
    let healthTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      try {
        const { startPresence } = await import("./client");
        const c = await startPresence(mode === "local" ? "local" : "webrtc", hud);
        if (stopped) {
          c.stop();
          return;
        }
        client = c;
        // If no signaling relay connects, settle honestly to off and stop
        // the reconnection attempts (solo room, bounded console noise).
        healthTimer = setTimeout(() => {
          if (!stopped && client?.degradeIfUnreachable()) {
            client = null;
            console.info("presence relays unreachable, the museum is solo this visit");
          }
        }, 8000);
      } catch {
        if (!stopped) {
          console.info("presence unavailable, the museum is solo this visit");
          hud.setAttribute("data-net", "off");
        }
      }
    })();

    const onPageHide = () => client?.bye();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      stopped = true;
      if (healthTimer) clearTimeout(healthTimer);
      window.removeEventListener("pagehide", onPageHide);
      client?.stop();
      client = null;
    };
  }, [loaded]);

  return null;
}
