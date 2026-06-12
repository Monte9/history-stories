"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ROOM } from "./layout";
import { playerStore } from "./playerStore";

// Chase camera (SPEC 11.3). Reads playerStore (written by WalkControls
// earlier in the same frame), owns the camera in both modes, mirrors
// data-cam-mode / data-cam-dist to the HUD.

const BOOM_DEFAULT = 3.5;
// Geometry always wins over any preferred minimum: a camera forced past the
// wall inset blacks out the frame (taste audit 2 finding 1).
const BOOM_HARD_MIN = 0.2;
const CAM_INSET = 0.35;
const CAM_HEIGHT = 2.5;
const LOOK_HEIGHT = 1.6;
// Body fade vs boom: fully visible above FADE_START, gone below FADE_END,
// so a wall-pinned camera never frames your own half-faded back (finding 2).
const FADE_START = 1.8;
const FADE_END = 1.2;

const look = new THREE.Vector3();

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const boomSmoothed = useRef(BOOM_DEFAULT);

  useFrame(() => {
    const p = playerStore;
    const hud = document.getElementById("museum-hud");

    if (p.camMode === "first") {
      camera.position.set(p.x, ROOM.eye, p.z);
      camera.rotation.set(
        THREE.MathUtils.degToRad(p.pitchDeg),
        -THREE.MathUtils.degToRad(p.headingDeg),
        0,
        "YXZ",
      );
      p.boom = 0;
      boomSmoothed.current = BOOM_DEFAULT;
      if (hud) {
        hud.setAttribute("data-cam-mode", "first");
        hud.setAttribute("data-cam-dist", "0.00");
      }
      return;
    }

    const rad = THREE.MathUtils.degToRad(p.headingDeg);
    // Behind the player, opposite the facing direction (forward is
    // (sin, 0, -cos) at heading 0 facing -z).
    const bx = -Math.sin(rad);
    const bz = Math.cos(rad);

    // Geometric maximum for the CURRENT heading: the camera stays inside
    // the room inset no matter what.
    const limit = ROOM.half - CAM_INSET;
    let boomGeo = BOOM_DEFAULT;
    for (const [pos, dir] of [
      [p.x, bx],
      [p.z, bz],
    ] as const) {
      if (dir > 1e-6) boomGeo = Math.min(boomGeo, (limit - pos) / dir);
      else if (dir < -1e-6) boomGeo = Math.min(boomGeo, (-limit - pos) / dir);
    }
    boomGeo = Math.max(boomGeo, BOOM_HARD_MIN);
    // Extend smoothly, shorten instantly: smoothing lag during a fast turn
    // near a wall is exactly how the camera used to clip through geometry.
    boomSmoothed.current = Math.min(
      boomSmoothed.current + (boomGeo - boomSmoothed.current) * 0.25,
      boomGeo,
    );
    const b = boomSmoothed.current;
    p.boom = b;

    camera.position.set(p.x + bx * b, CAM_HEIGHT, p.z + bz * b);
    // Pitching up raises the look target so the top wall row is aimable.
    const pitchRad = THREE.MathUtils.degToRad(p.pitchDeg);
    look.set(p.x, LOOK_HEIGHT + Math.tan(pitchRad) * 3.0, p.z);
    camera.lookAt(look);

    if (hud) {
      hud.setAttribute("data-cam-mode", "third");
      hud.setAttribute("data-cam-dist", b.toFixed(2));
    }
  });

  return null;
}

// Local body fade: invisible in first person, fades out as the boom
// closes in so the avatar's back never fills the frame.
export function localBodyOpacity(): number {
  const p = playerStore;
  if (p.camMode === "first") return 0;
  return THREE.MathUtils.clamp((p.boom - FADE_END) / (FADE_START - FADE_END), 0, 1);
}
