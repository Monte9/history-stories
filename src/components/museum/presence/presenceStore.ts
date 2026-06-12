"use client";

import type { PresenceClient } from "./client";

// Bridge between the DOM-side PresenceManager (owns the client lifecycle)
// and the Canvas-side RemoteAvatars (renders bodies from peer state).
export const presenceStore = {
  client: null as PresenceClient | null,
  // Resolved at room mount, before networking starts, so openStory can
  // persist the session's choice even if Enter fires before settle.
  mode: null as "local" | "off" | "webrtc" | null,
};

export const NET_RETURN_KEY = "museum.netReturn.v1";

// The round-trip flag is consumed exactly once, at room mount. A short
// module-level cache covers double-invoked mount effects; it cannot leak
// across full page loads (fresh JS context) or linger past 5 s, so the
// story round trip stays the only inheritance path (sprint 15 AC2).
let justConsumed: { value: string | null; at: number } | null = null;

function consumeReturnFlag(): string | null {
  try {
    const v = sessionStorage.getItem(NET_RETURN_KEY);
    if (v !== null) {
      sessionStorage.removeItem(NET_RETURN_KEY);
      justConsumed = { value: v, at: Date.now() };
      return v;
    }
    if (justConsumed && Date.now() - justConsumed.at < 5000) {
      return justConsumed.value;
    }
  } catch {}
  return null;
}

// Explicit ?net= wins; a story round trip inherits via the one-shot flag;
// fresh paramless visits get the production default (sprint 15 AC2).
export function resolveNetMode(): "local" | "off" | "webrtc" {
  const param = new URLSearchParams(window.location.search).get("net");
  const inherited = consumeReturnFlag();
  if (param === "off" || param === "local") return param;
  if (param) return "webrtc";
  if (inherited === "off" || inherited === "local") return inherited;
  return "webrtc";
}
