"use client";

import type { PresenceClient } from "./client";

// Bridge between the DOM-side PresenceManager (owns the client lifecycle)
// and the Canvas-side RemoteAvatars (renders bodies from peer state).
export const presenceStore = {
  client: null as PresenceClient | null,
};
