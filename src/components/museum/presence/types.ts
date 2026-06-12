"use client";

// Presence wire types (SPEC 12.2-12.3). The protocol layer (client.ts) is
// transport-agnostic; transports only move small JSON messages.

// Type alias (not interface) so it satisfies trystero's JsonValue payloads.
export type PeerState = {
  x: number;
  z: number;
  h: number; // heading deg
  p: number; // pitch deg
  s: number; // planar speed units/s
  v?: number; // body variant 0-3 (absent from older clients = 0)
};

export type WireMessage = { t: "st"; d: PeerState } | { t: "bye" };

export interface RawTransport {
  kind: "webrtc" | "local";
  selfId: string;
  send(msg: WireMessage): void;
  onMessage(cb: (from: string, msg: WireMessage) => void): void;
  close(): void;
  // webrtc only: is any signaling relay actually connected?
  healthy?(): boolean;
  // webrtc only: stop reconnection attempts (bounds console noise offline)
  quiesce?(): void;
}
