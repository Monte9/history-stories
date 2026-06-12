"use client";

import type { PeerState, RawTransport, WireMessage } from "./types";

const APP_ID = "history-stories-museum";
const ROOM_ID = "museum-v1";

// Production transport (SPEC 12.1-12.2): trystero over Nostr public relays,
// then pure P2P WebRTC data channels. Zero credentials. Pinned to the
// classic 0.21 line: it announces every ~5 s forever, so a visitor idling
// alone stays discoverable to late arrivals (the 0.25 fork's passive mode
// went deaf after ~2 minutes — Monte's reported failure). Any failure here
// is caught by the caller and degrades the room to net=off.
export async function createWebrtcTransport(): Promise<RawTransport> {
  const { joinRoom, selfId, getRelaySockets } = await import("trystero/nostr");
  const room = joinRoom({ appId: APP_ID }, ROOM_ID);
  const [sendState, onState] = room.makeAction<PeerState>("st");
  const [sendBye, onBye] = room.makeAction<null>("bye");

  let handler: ((from: string, msg: WireMessage) => void) | null = null;
  onState((d, peerId) => handler?.(peerId, { t: "st", d }));
  onBye((_d, peerId) => handler?.(peerId, { t: "bye" }));
  room.onPeerLeave((peerId) => handler?.(peerId, { t: "bye" }));

  return {
    kind: "webrtc",
    selfId,
    send(msg) {
      try {
        if (msg.t === "st") {
          void sendState(msg.d);
        } else {
          void sendBye(null);
        }
      } catch {
        // a closing peer connection mid-send is not an error worth surfacing
      }
    },
    onMessage(cb) {
      handler = cb;
    },
    close() {
      try {
        void room.leave();
      } catch {}
    },
    healthy() {
      try {
        const sockets = getRelaySockets() as Record<string, WebSocket | undefined>;
        return Object.values(sockets).some(
          (ws) => ws?.readyState === WebSocket.OPEN,
        );
      } catch {
        return false;
      }
    },
    quiesce() {
      // 0.21 has no reconnection pause API; closing the room (via close())
      // is what stops traffic after a degrade.
    },
  };
}
