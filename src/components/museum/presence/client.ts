"use client";

import { playerStore } from "../playerStore";
import { createLocalTransport } from "./local";
import { hashColor, interpolate, type Peer } from "./peers";
import type { PeerState, RawTransport } from "./types";

export { interpolate, PEER_PALETTE, type Peer, type PeerLifecycle } from "./peers";

// Protocol layer (SPEC 12.3-12.6): tick + heartbeat sending, peer registry
// with entering/live/leaving lifecycle, heartbeat timeout, interpolated
// pose readout, and the DOM evaluability mirror. Transport-agnostic.

const TICK_MS = 100; // 10 Hz while moving
const HEARTBEAT_MS = 2000;
const TIMEOUT_MS = 6000; // 3 missed heartbeats = gone
const ENTER_MS = 400;
const LEAVE_MS = 400;
const TELEPORT_JUMP = 3; // units; larger jumps relocate, never glide
const RENDER_CAP = 8; // SPEC 12.3: render at most 8 remote avatars
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

  // Promote tracked-but-unrendered peers (join order) into freed slots,
  // staged like a fresh arrival so promotion never pops.
  private fillRenderSlots(now: number) {
    let rendered = 0;
    for (const peer of this.peers.values()) {
      if (peer.rendered && peer.state !== "leaving") rendered++;
    }
    for (const peer of this.peers.values()) {
      if (rendered >= RENDER_CAP) break;
      if (peer.rendered || peer.state === "leaving") continue;
      peer.rendered = true;
      peer.state = "entering";
      peer.enteredAt = now;
      peer.node = this.makeNode(peer.id, peer.label, peer.color);
      rendered++;
    }
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
    let renderedCount = 0;
    let total = 0;
    for (const peer of this.peers.values()) {
      if (peer.state === "entering" && now - peer.enteredAt >= ENTER_MS) {
        peer.state = "live";
      }
      if (peer.state !== "leaving" && now - peer.lastAt > TIMEOUT_MS) {
        peer.state = "leaving";
        peer.leavingAt = now;
      }
      if (peer.state === "leaving" && now - peer.leavingAt >= LEAVE_MS) {
        peer.node?.remove();
        this.peers.delete(peer.id);
        continue;
      }
      // Leaving peers keep their node for the fade but stop counting, so a
      // reload (bye + instant rejoin) never overcounts one human.
      if (peer.state !== "leaving") {
        total++;
        if (peer.rendered) renderedCount++;
      }
      if (!peer.node) continue;
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
    if (renderedCount < RENDER_CAP && total > renderedCount) {
      this.fillRenderSlots(now);
      renderedCount = Math.min(total, RENDER_CAP);
    }
    this.hud.setAttribute("data-peers", String(renderedCount));
    this.hud.setAttribute("data-peers-total", String(total));
  }

  private makeNode(id: string, label: string, color: string): HTMLElement {
    const node = document.createElement("div");
    node.className = "museum-peer";
    node.setAttribute("data-peer-id", id);
    node.setAttribute("data-peer-label", label);
    node.setAttribute("data-peer-color", color);
    node.setAttribute("data-peer-state", "entering");
    this.hud.appendChild(node);
    return node;
  }

  private onState(from: string, s: PeerState) {
    const now = performance.now();
    let peer = this.peers.get(from);
    if (!peer) {
      const label = `Visitor ${this.nextVisitor++}`;
      const color = hashColor(from);
      let rendered = 0;
      for (const p of this.peers.values()) {
        if (p.rendered && p.state !== "leaving") rendered++;
      }
      const renderNow = rendered < RENDER_CAP;
      peer = {
        id: from,
        label,
        color,
        state: "entering",
        rendered: renderNow,
        enteredAt: now,
        leavingAt: 0,
        teleportAt: 0,
        lastAt: now,
        prev: null,
        latest: { s, at: now },
        node: renderNow ? this.makeNode(from, label, color) : null,
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
    // Teleport rule (SPEC 12.3): a jump > 3 u snaps both samples to the new
    // spot, so neither the DOM mirror nor the body ever glides across it.
    const jump = Math.hypot(s.x - peer.latest.s.x, s.z - peer.latest.s.z);
    if (jump > TELEPORT_JUMP) {
      peer.prev = { s, at: now };
      peer.latest = { s, at: now };
      peer.teleportAt = now;
      peer.lastAt = now;
      return;
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
    for (const peer of this.peers.values()) peer.node?.remove();
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
