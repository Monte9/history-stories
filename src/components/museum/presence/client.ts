"use client";

import { playerStore } from "../playerStore";
import { createLocalTransport } from "./local";
import type { PeerState, RawTransport } from "./types";

// Protocol layer (SPEC 12.3-12.6): tick + heartbeat sending, peer registry
// with entering/live/leaving lifecycle, heartbeat timeout, interpolated
// pose readout, and the DOM evaluability mirror. Transport-agnostic.

const TICK_MS = 100; // 10 Hz while moving
const HEARTBEAT_MS = 2000;
const TIMEOUT_MS = 6000; // 3 missed heartbeats = gone
const ENTER_MS = 400;
const LEAVE_MS = 400;
const INTERP_DELAY_MS = 150;
const EXTRAPOLATE_MAX_MS = 250;

// 8 muted, white-wall-legible tints (SPEC 12.4).
export const PEER_PALETTE = [
  "#b85c38", // terracotta
  "#2d7d72", // teal
  "#4f5d9e", // indigo
  "#b08b2e", // ochre
  "#8e4f79", // plum
  "#6b7f3a", // moss
  "#5b7793", // slate
  "#b06161", // rose
];

function hashColor(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33) ^ id.charCodeAt(i);
  return PEER_PALETTE[Math.abs(h) % PEER_PALETTE.length];
}

interface Sample {
  s: PeerState;
  at: number;
}

export type PeerLifecycle = "entering" | "live" | "leaving";

export interface Peer {
  id: string;
  label: string;
  color: string;
  state: PeerLifecycle;
  enteredAt: number;
  leavingAt: number; // 0 until leaving
  lastAt: number;
  prev: Sample | null;
  latest: Sample;
  node: HTMLElement;
}

function shortestArcLerp(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

// Rendered pose at (now - 150 ms): lerp between the two newest samples,
// extrapolate at most 250 ms across gaps, then hold (SPEC 12.3).
export function interpolate(peer: Peer, now: number): PeerState {
  const target = now - INTERP_DELAY_MS;
  const { prev, latest } = peer;
  if (!prev || latest.at <= prev.at) return latest.s;
  if (target <= prev.at) return prev.s;
  const span = latest.at - prev.at;
  let t = (target - prev.at) / span;
  if (t > 1) {
    const overshoot = Math.min(target - latest.at, EXTRAPOLATE_MAX_MS);
    t = 1 + overshoot / span;
  }
  return {
    x: prev.s.x + (latest.s.x - prev.s.x) * t,
    z: prev.s.z + (latest.s.z - prev.s.z) * t,
    h: shortestArcLerp(prev.s.h, latest.s.h, Math.min(t, 1)),
    p: prev.s.p + (latest.s.p - prev.s.p) * Math.min(t, 1),
    s: latest.s.s,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function selfState(): PeerState {
  return {
    x: round2(playerStore.x),
    z: round2(playerStore.z),
    h: round2(((playerStore.headingDeg % 360) + 360) % 360),
    p: round2(playerStore.pitchDeg),
    s: round2(playerStore.speed),
  };
}

function changed(a: PeerState, b: PeerState): boolean {
  return (
    Math.abs(a.x - b.x) > 0.01 ||
    Math.abs(a.z - b.z) > 0.01 ||
    Math.abs(((a.h - b.h + 540) % 360) - 180) > 0.5 ||
    Math.abs(a.p - b.p) > 0.5 ||
    Math.abs(a.s - b.s) > 0.05
  );
}

export class PresenceClient {
  readonly peers = new Map<string, Peer>();
  private transport: RawTransport;
  private hud: HTMLElement;
  private nextVisitor = 2; // you are implicitly Visitor 1, unlabeled
  private lastSent: PeerState | null = null;
  private lastSentAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private byeSent = false;

  constructor(transport: RawTransport, hud: HTMLElement) {
    this.transport = transport;
    this.hud = hud;
    transport.onMessage((from, msg) => {
      if (msg.t === "st") this.onState(from, msg.d);
      else this.onBye(from);
    });
  }

  start() {
    this.hud.setAttribute("data-net", this.transport.kind);
    this.hud.setAttribute("data-peers", "0");
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    const now = performance.now();
    // Send: on change at 10 Hz, else heartbeat every 2 s.
    const state = selfState();
    if (
      !this.lastSent ||
      changed(state, this.lastSent) ||
      now - this.lastSentAt >= HEARTBEAT_MS
    ) {
      this.transport.send({ t: "st", d: state });
      this.lastSent = state;
      this.lastSentAt = now;
    }
    // Lifecycle sweep + DOM mirror.
    let count = 0;
    for (const peer of this.peers.values()) {
      if (peer.state === "entering" && now - peer.enteredAt >= ENTER_MS) {
        peer.state = "live";
      }
      if (peer.state !== "leaving" && now - peer.lastAt > TIMEOUT_MS) {
        peer.state = "leaving";
        peer.leavingAt = now;
      }
      if (peer.state === "leaving" && now - peer.leavingAt >= LEAVE_MS) {
        peer.node.remove();
        this.peers.delete(peer.id);
        continue;
      }
      // Leaving peers keep their node for the fade but stop counting, so a
      // reload (bye + instant rejoin) never overcounts one human.
      if (peer.state !== "leaving") count++;
      const pose = interpolate(peer, now);
      const n = peer.node;
      n.setAttribute("data-peer-x", pose.x.toFixed(2));
      n.setAttribute("data-peer-z", pose.z.toFixed(2));
      n.setAttribute(
        "data-peer-heading",
        (((pose.h % 360) + 360) % 360).toFixed(2),
      );
      n.setAttribute("data-peer-state", peer.state);
    }
    this.hud.setAttribute("data-peers", String(count));
  }

  private onState(from: string, s: PeerState) {
    const now = performance.now();
    let peer = this.peers.get(from);
    if (!peer) {
      const node = document.createElement("div");
      node.className = "museum-peer";
      node.setAttribute("data-peer-id", from);
      const label = `Visitor ${this.nextVisitor++}`;
      const color = hashColor(from);
      node.setAttribute("data-peer-label", label);
      node.setAttribute("data-peer-color", color);
      node.setAttribute("data-peer-state", "entering");
      this.hud.appendChild(node);
      peer = {
        id: from,
        label,
        color,
        state: "entering",
        enteredAt: now,
        leavingAt: 0,
        lastAt: now,
        prev: null,
        latest: { s, at: now },
        node,
      };
      this.peers.set(from, peer);
      return;
    }
    // A returning peer mid-fade-out comes back to life.
    if (peer.state === "leaving") {
      peer.state = "entering";
      peer.enteredAt = now;
      peer.leavingAt = 0;
    }
    peer.prev = peer.latest;
    peer.latest = { s, at: now };
    peer.lastAt = now;
  }

  private onBye(from: string) {
    const peer = this.peers.get(from);
    if (!peer || peer.state === "leaving") return;
    peer.state = "leaving";
    peer.leavingAt = performance.now();
  }

  bye() {
    if (this.byeSent) return;
    this.byeSent = true;
    this.transport.send({ t: "bye" });
  }

  // No relay ever connected (offline, blocked egress): true if degraded.
  degradeIfUnreachable(): boolean {
    if (this.transport.kind !== "webrtc") return false;
    if (this.transport.healthy?.()) return false;
    this.transport.quiesce?.();
    this.stop();
    this.hud.setAttribute("data-net", "off");
    return true;
  }

  stop() {
    this.bye();
    if (this.timer) clearInterval(this.timer);
    for (const peer of this.peers.values()) peer.node.remove();
    this.peers.clear();
    this.hud.setAttribute("data-peers", "0");
    this.transport.close();
  }
}

// Entry point for the lazy chunk: pick the transport, join, start ticking.
export async function startPresence(
  mode: "local" | "webrtc",
  hud: HTMLElement,
): Promise<PresenceClient> {
  const transport =
    mode === "local"
      ? createLocalTransport()
      : await (await import("./webrtc")).createWebrtcTransport();
  const client = new PresenceClient(transport, hud);
  client.start();
  return client;
}
