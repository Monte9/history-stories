"use client";

export type CamMode = "third" | "first";

export const CAM_MODE_KEY = "museum.camMode.v1";

// Player pose and camera state. Written by WalkControls (pose, each frame)
// and setCamMode; read by CameraRig, FocusManager, the local avatar, and
// later the presence sender. Module singleton so remounts (Escape return)
// keep continuity until WalkControls re-initializes it.
export const playerStore = {
  x: -5,
  z: 0,
  headingDeg: 0,
  pitchDeg: 0,
  speed: 0, // planar units/s, from actual displacement
  turnRate: 0, // deg/s, from actual heading change
  camMode: "third" as CamMode,
  boom: 0, // current chase-camera distance; 0 in first person
  variant: 0, // body look, index into AVATAR_VARIANTS
};

const VARIANT_KEY = "museum.avatar.v1";
const VARIANT_COUNT = 4;

// Each browser gets a random body on first visit; B cycles it (Monte,
// 2026-06-12). localStorage so the look sticks across visits.
export function initVariant() {
  let v = -1;
  try {
    v = parseInt(localStorage.getItem(VARIANT_KEY) || "", 10);
  } catch {}
  if (!(v >= 0 && v < VARIANT_COUNT)) {
    v = Math.floor(Math.random() * VARIANT_COUNT);
    try {
      localStorage.setItem(VARIANT_KEY, String(v));
    } catch {}
  }
  playerStore.variant = v;
  for (const fn of listeners) fn();
}

export function cycleVariant() {
  playerStore.variant = (playerStore.variant + 1) % VARIANT_COUNT;
  try {
    localStorage.setItem(VARIANT_KEY, String(playerStore.variant));
  } catch {}
  for (const fn of listeners) fn();
}

const listeners = new Set<() => void>();

export function subscribeCamMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setCamMode(mode: CamMode) {
  playerStore.camMode = mode;
  try {
    sessionStorage.setItem(CAM_MODE_KEY, mode);
  } catch {}
  for (const fn of listeners) fn();
}

export const CAM_RETURN_KEY = "museum.camReturn.v1";

// Resolve the mode for this load: ?cam= forces it; a story round trip
// inherits the mode in effect at Enter (one-shot flag, so a ?cam=-forced
// session survives its own round trip); else the stored toggle choice;
// else third person (the default since GOAL.md's body revision).
export function initCamMode() {
  let mode: CamMode = "third";
  try {
    // Peek, don't delete: the flag is overwritten at the next story Enter,
    // and full page loads start a fresh room session anyway. Deleting here
    // would break under double-invoked mount effects.
    const returned = sessionStorage.getItem(CAM_RETURN_KEY);
    const forced = new URLSearchParams(window.location.search).get("cam");
    const saved = sessionStorage.getItem(CAM_MODE_KEY);
    if (forced === "first" || forced === "third") mode = forced;
    else if (returned === "first" || returned === "third") mode = returned;
    else if (saved === "first" || saved === "third") mode = saved;
  } catch {}
  playerStore.camMode = mode;
  for (const fn of listeners) fn();
}
