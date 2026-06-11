"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DEFAULT_SPAWN, FACE_HEADINGS, ROOM, type WallId } from "./layout";

const WALK_SPEED = 3; // units/s
const TURN_SPEED = 100; // deg/s
const SMOOTH = 0.15; // s to ~reach target velocity
const CLAMP = ROOM.half - ROOM.margin;

type Action = "fwd" | "back" | "left" | "right";

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
  const camera = useThree((s) => s.camera);
  const keys = useRef<Set<Action>>(new Set());
  const pos = useRef({ x: DEFAULT_SPAWN.x, z: DEFAULT_SPAWN.z });
  const heading = useRef(DEFAULT_SPAWN.headingDeg);
  const vel = useRef({ walk: 0, turn: 0 });

  const apply = useCallback(() => {
    camera.position.set(pos.current.x, ROOM.eye, pos.current.z);
    camera.rotation.set(
      0,
      -THREE.MathUtils.degToRad(heading.current),
      0,
      "YXZ",
    );
    const hud = document.getElementById("museum-hud");
    if (hud) {
      hud.setAttribute("data-x", pos.current.x.toFixed(2));
      hud.setAttribute("data-z", pos.current.z.toFixed(2));
      hud.setAttribute(
        "data-heading",
        (((heading.current % 360) + 360) % 360).toFixed(1),
      );
    }
  }, [camera]);

  useEffect(() => {
    const face = new URLSearchParams(window.location.search).get(
      "face",
    ) as WallId | null;
    if (face && face in FACE_HEADINGS) {
      pos.current = { x: 0, z: 0 };
      heading.current = FACE_HEADINGS[face];
    }
    apply();

    const down = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      keys.current.add(action);
    };
    const up = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (action) keys.current.delete(action);
    };
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [apply]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const k = keys.current;
    const targetWalk =
      (k.has("fwd") ? WALK_SPEED : 0) + (k.has("back") ? -WALK_SPEED : 0);
    const targetTurn =
      (k.has("right") ? TURN_SPEED : 0) + (k.has("left") ? -TURN_SPEED : 0);
    const a = Math.min(1, dt / SMOOTH);
    vel.current.walk += (targetWalk - vel.current.walk) * a;
    vel.current.turn += (targetTurn - vel.current.turn) * a;
    if (
      targetWalk === 0 &&
      targetTurn === 0 &&
      Math.abs(vel.current.walk) < 0.002 &&
      Math.abs(vel.current.turn) < 0.05
    ) {
      vel.current.walk = 0;
      vel.current.turn = 0;
      return;
    }
    heading.current += vel.current.turn * dt;
    const rad = THREE.MathUtils.degToRad(heading.current);
    pos.current.x = THREE.MathUtils.clamp(
      pos.current.x + Math.sin(rad) * vel.current.walk * dt,
      -CLAMP,
      CLAMP,
    );
    pos.current.z = THREE.MathUtils.clamp(
      pos.current.z - Math.cos(rad) * vel.current.walk * dt,
      -CLAMP,
      CLAMP,
    );
    apply();
  });

  return null;
}
