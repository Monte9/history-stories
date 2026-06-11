"use client";

import type { RawTransport, WireMessage } from "./types";

const CHANNEL = "museum.presence.local";

// Reference transport (SPEC 12.2): same-origin tabs in one browser profile
// over BroadcastChannel. Implements the identical message surface trystero
// re-wires, so the eval path proves the real protocol layer.
export function createLocalTransport(): RawTransport {
  const selfId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const channel = new BroadcastChannel(CHANNEL);
  let handler: ((from: string, msg: WireMessage) => void) | null = null;

  channel.onmessage = (e) => {
    const { from, msg } = e.data || {};
    if (!from || from === selfId || !msg) return;
    handler?.(from, msg as WireMessage);
  };

  return {
    kind: "local",
    selfId,
    send(msg) {
      try {
        channel.postMessage({ from: selfId, msg });
      } catch {
        // channel closed mid-send (tab shutting down); nothing to do
      }
    },
    onMessage(cb) {
      handler = cb;
    },
    close() {
      channel.close();
    },
  };
}
