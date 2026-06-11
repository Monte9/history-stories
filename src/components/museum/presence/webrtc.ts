"use client";

import type { PeerState, RawTransport, WireMessage } from "./types";

const APP_ID = "history-stories-museum";
const ROOM_ID = "museum-v1";

// Production transport (SPEC 12.1-12.2): trystero over Nostr public relays,
// then pure P2P WebRTC data channels. Zero credentials. Any failure here is
// caught by the caller and degrades the room to net=off.
export async function createWebrtcTransport(): Promise<RawTransport> {
  const { joinRoom, selfId, getRelaySockets, pauseRelayReconnection } =
    await import("trystero/nostr");
  const room = joinRoom({ appId: APP_ID }, ROOM_ID);
  const stateAction = room.makeAction<PeerState>("st");
  const byeAction = room.makeAction<null>("bye");

  let handler: ((from: string, msg: WireMessage) => void) | null = null;
  stateAction.onMessage = (d, { peerId }) => handler?.(peerId, { t: "st", d });
  byeAction.onMessage = (_d, { peerId }) => handler?.(peerId, { t: "bye" });
  room.onPeerLeave = (peerId) => handler?.(peerId, { t: "bye" });

  return {
    kind: "webrtc",
    selfId,
    send(msg) {
      try {
        if (msg.t === "st") {
          stateAction.send(msg.d).catch(() => {});
        } else {
          byeAction.send(null).catch(() => {});
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
        room.leave().catch(() => {});
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
      try {
        pauseRelayReconnection();
      } catch {}
    },
  };
}
