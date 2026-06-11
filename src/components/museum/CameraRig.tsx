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
const BOOM_MIN = 0.7;
const CAM_INSET = 0.35;
const CAM_HEIGHT = 2.5;
const LOOK_HEIGHT = 1.6;
const FADE_BELOW = 1.3; // body fades when the boom is shorter than this

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

    // Shorten the boom so the camera stays inside the room inset.
    const limit = ROOM.half - CAM_INSET;
    let boom = BOOM_DEFAULT;
    for (const [pos, dir] of [
      [p.x, bx],
      [p.z, bz],
    ] as const) {
      if (dir > 1e-6) boom = Math.min(boom, (limit - pos) / dir);
      else if (dir < -1e-6) boom = Math.min(boom, (-limit - pos) / dir);
    }
    boom = THREE.MathUtils.clamp(boom, BOOM_MIN, BOOM_DEFAULT);
    // Light smoothing for feel; snaps are jarring on wall contact.
    boomSmoothed.current += (boom - boomSmoothed.current) * 0.25;
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
  return THREE.MathUtils.clamp((p.boom - BOOM_MIN) / (FADE_BELOW - BOOM_MIN), 0, 1);
}
