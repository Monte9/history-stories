"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DEFAULT_SPAWN, FACE_HEADINGS, ROOM, type WallId } from "./layout";
import { playerStore } from "./playerStore";

const WALK_SPEED = 4; // units/s (Monte 2026-06-12: brisker pace)
const SPRINT_SPEED = 7; // units/s while Shift is held
const TURN_SPEED = 100; // deg/s
const SMOOTH = 0.15; // s to ~reach target velocity
const CLAMP = ROOM.half - ROOM.margin;

// Trackpad/wheel: scroll up walks forward, horizontal scroll turns (SPEC 3.3).
const WHEEL_WALK = 0.012; // (units/s) per wheel delta unit
const WHEEL_TURN = 0.4; // (deg/s) per wheel delta unit
const WHEEL_DECAY = 0.25; // s, impulse decay time constant
// Pointer drag: mouselook, drag right turns right, drag up pitches up.
const DRAG_TURN = 0.25; // deg per px
const DRAG_PITCH = 0.15; // deg per px
const PITCH_LIMIT = 25; // deg

export const CAMERA_KEY = "museum.camera.v1";

// Once Enter-navigation saves the camera, residual velocity decay must not
// overwrite it before the room unmounts.
let savesLocked = false;

export function lockSaves() {
  savesLocked = true;
}

export function saveCamera(x: number, z: number, headingDeg: number) {
  try {
    sessionStorage.setItem(
      CAMERA_KEY,
      JSON.stringify({ x, z, headingDeg, savedAt: Date.now() }),
    );
  } catch {}
}

function restoreCamera(): { x: number; z: number; headingDeg: number } | null {
  try {
    const raw = sessionStorage.getItem(CAMERA_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (
      typeof v.x !== "number" ||
      typeof v.z !== "number" ||
      typeof v.headingDeg !== "number"
    )
      return null;
    return {
      x: THREE.MathUtils.clamp(v.x, -CLAMP, CLAMP),
      z: THREE.MathUtils.clamp(v.z, -CLAMP, CLAMP),
      headingDeg: v.headingDeg,
    };
  } catch {
    return null;
  }
}

export type Action = "fwd" | "back" | "left" | "right";

// On-screen touch controls press these; merged with keyboard input each frame.
const externalKeys = new Set<Action>();

export function pressAction(action: Action) {
  externalKeys.add(action);
}

export function releaseAction(action: Action) {
  externalKeys.delete(action);
}

const KEYMAP: Record<string, Action> = {
  ArrowUp: "fwd",
  KeyW: "fwd",
  ArrowDown: "back",
  KeyS: "back",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export default function WalkControls() {
  const gl = useThree((s) => s.gl);
  const keys = useRef<Set<Action>>(new Set());
  const pos = useRef({ x: DEFAULT_SPAWN.x, z: DEFAULT_SPAWN.z });
  const heading = useRef(DEFAULT_SPAWN.headingDeg);
  const pitch = useRef(0);
  const vel = useRef({ walk: 0, turn: 0 });
  const wheelVel = useRef({ walk: 0, turn: 0 });
  const dragAccum = useRef({ heading: 0, pitch: 0 });
  const sprint = useRef(false);
  const lastSave = useRef(0);

  // Publish pose to playerStore (CameraRig, FocusManager, and the avatar
  // read it) and mirror to the HUD. WalkControls no longer owns the camera.
  const apply = useCallback(() => {
    playerStore.x = pos.current.x;
    playerStore.z = pos.current.z;
    playerStore.headingDeg = heading.current;
    playerStore.pitchDeg = pitch.current;
    const hud = document.getElementById("museum-hud");
    if (hud) {
      hud.setAttribute("data-x", pos.current.x.toFixed(2));
      hud.setAttribute("data-z", pos.current.z.toFixed(2));
      const norm = ((heading.current % 360) + 360) % 360;
      hud.setAttribute(
        "data-heading",
        ((Math.round(norm * 10) / 10) % 360).toFixed(1),
      );
      hud.setAttribute("data-pitch", pitch.current.toFixed(1));
      hud.setAttribute("data-speed", playerStore.speed.toFixed(2));
    }
  }, []);

  // Layout effect: the restored camera must be in place before the first
  // rendered frame, or FocusManager briefly focuses along the default view.
  useLayoutEffect(() => {
    savesLocked = false;
    externalKeys.clear();
    const face = new URLSearchParams(window.location.search).get(
      "face",
    ) as WallId | null;
    pitch.current = 0;
    if (face && face in FACE_HEADINGS) {
      // Eval/debug affordance: overrides any saved camera for this load.
      pos.current = { x: 0, z: 0 };
      heading.current = FACE_HEADINGS[face];
    } else {
      const saved = restoreCamera();
      if (saved) {
        pos.current = { x: saved.x, z: saved.z };
        heading.current = saved.headingDeg;
      }
    }
    apply();

    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") sprint.current = true;
      const action = KEYMAP[e.code];
      if (!action) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      keys.current.add(action);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") sprint.current = false;
      const action = KEYMAP[e.code];
      if (action) keys.current.delete(action);
    };
    const clear = () => {
      keys.current.clear();
      sprint.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [apply]);

  // Wheel and pointer-drag input on the canvas element (SPEC 3.3).
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      // The page must never scroll or pinch-zoom while over the room.
      e.preventDefault();
      wheelVel.current.walk = THREE.MathUtils.clamp(
        wheelVel.current.walk - e.deltaY * WHEEL_WALK,
        -WALK_SPEED,
        WALK_SPEED,
      );
      wheelVel.current.turn = THREE.MathUtils.clamp(
        wheelVel.current.turn + e.deltaX * WHEEL_TURN,
        -TURN_SPEED,
        TURN_SPEED,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    let dragging = false;
    let pointerId = -1;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragAccum.current.heading += (e.clientX - lastX) * DRAG_TURN;
      dragAccum.current.pitch += (lastY - e.clientY) * DRAG_PITCH;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId === pointerId) dragging = false;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const active = (a: Action) =>
      keys.current.has(a) || externalKeys.has(a);
    // Shift sprints the body (Monte 2026-06-12); wheel impulses stay at
    // walking pace.
    const pace = sprint.current ? SPRINT_SPEED : WALK_SPEED;
    const targetWalk =
      (active("fwd") ? pace : 0) + (active("back") ? -pace : 0);
    const targetTurn =
      (active("right") ? TURN_SPEED : 0) + (active("left") ? -TURN_SPEED : 0);
    const a = Math.min(1, dt / SMOOTH);
    vel.current.walk += (targetWalk - vel.current.walk) * a;
    vel.current.turn += (targetTurn - vel.current.turn) * a;
    const drag = dragAccum.current;
    if (
      targetWalk === 0 &&
      targetTurn === 0 &&
      Math.abs(vel.current.walk) < 0.002 &&
      Math.abs(vel.current.turn) < 0.05 &&
      Math.abs(wheelVel.current.walk) < 0.002 &&
      Math.abs(wheelVel.current.turn) < 0.05 &&
      drag.heading === 0 &&
      drag.pitch === 0
    ) {
      vel.current.walk = 0;
      vel.current.turn = 0;
      wheelVel.current.walk = 0;
      wheelVel.current.turn = 0;
      if (playerStore.speed !== 0 || playerStore.turnRate !== 0) {
        playerStore.speed = 0;
        playerStore.turnRate = 0;
        apply();
      }
      return;
    }
    // Inputs sum into one velocity; the current pace caps the total.
    const walk = THREE.MathUtils.clamp(
      vel.current.walk + wheelVel.current.walk,
      -pace,
      pace,
    );
    const turn = THREE.MathUtils.clamp(
      vel.current.turn + wheelVel.current.turn,
      -TURN_SPEED,
      TURN_SPEED,
    );
    const decay = Math.exp(-dt / WHEEL_DECAY);
    wheelVel.current.walk *= decay;
    wheelVel.current.turn *= decay;

    const prevX = pos.current.x;
    const prevZ = pos.current.z;
    const prevHeading = heading.current;
    heading.current += turn * dt + drag.heading;
    pitch.current = THREE.MathUtils.clamp(
      pitch.current + drag.pitch,
      -PITCH_LIMIT,
      PITCH_LIMIT,
    );
    drag.heading = 0;
    drag.pitch = 0;
    const rad = THREE.MathUtils.degToRad(heading.current);
    pos.current.x = THREE.MathUtils.clamp(
      pos.current.x + Math.sin(rad) * walk * dt,
      -CLAMP,
      CLAMP,
    );
    pos.current.z = THREE.MathUtils.clamp(
      pos.current.z - Math.cos(rad) * walk * dt,
      -CLAMP,
      CLAMP,
    );
    // Signed planar speed from actual displacement (clamping at a wall
    // reads as 0, so the gait never marches in place against a wall).
    const planar = Math.hypot(pos.current.x - prevX, pos.current.z - prevZ);
    playerStore.speed = (walk < 0 ? -1 : 1) * (planar / dt);
    playerStore.turnRate = (heading.current - prevHeading) / dt;
    apply();
    const now = performance.now();
    if (!savesLocked && now - lastSave.current > 500) {
      lastSave.current = now;
      saveCamera(pos.current.x, pos.current.z, heading.current);
    }
  });

  return null;
}
