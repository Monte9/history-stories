"use client";

import type { PeerState } from "./types";

// Pure peer state shared by the lazy protocol client and the always-loaded
// renderer: types, palette, and the interpolation math. No transport code,
// so importing this does not defeat the lazy presence chunk.

export const INTERP_DELAY_MS = 150;
// Short extrapolation: at 3 u/s this bounds gap drift to ~0.15 u, so a peer
// whose updates stop freezes in place instead of ghost-walking.
export const EXTRAPOLATE_MAX_MS = 50;

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

export function hashColor(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33) ^ id.charCodeAt(i);
  return PEER_PALETTE[Math.abs(h) % PEER_PALETTE.length];
}

export interface Sample {
  s: PeerState;
  at: number;
}

export type PeerLifecycle = "entering" | "live" | "leaving";

export interface Peer {
  id: string;
  label: string;
  color: string;
  state: PeerLifecycle;
  // Render cap (SPEC 12.3): at most 8 peers are rendered (body + DOM node);
  // the rest are tracked and promoted when a rendered slot frees up.
  rendered: boolean;
  enteredAt: number;
  leavingAt: number; // 0 until leaving
  teleportAt: number; // 0, or when a >3 u jump snapped this peer
  lastAt: number;
  prev: Sample | null;
  latest: Sample;
  node: HTMLElement | null; // exists only while rendered
}

function shortestArcLerp(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

// Rendered pose at (now - 150 ms): lerp between the two newest samples,
// extrapolate at most 50 ms across gaps, then hold (SPEC 12.3).
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
