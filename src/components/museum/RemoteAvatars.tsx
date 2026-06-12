"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import AvatarBody, { type AvatarPose } from "./AvatarBody";
import { makeTextTexture } from "./textures";
import { presenceStore } from "./presence/presenceStore";
import { interpolate, type Peer } from "./presence/peers";

// Remote visitors (SPEC 12.4-12.5): tinted bodies driven by interpolated
// peer state, billboard labels, staged enter/leave/teleport fades. Scenery
// only: never collides, never raycasts, never touches local state.

const ENTER_MS = 400;
const LEAVE_MS = 400;
const TELEPORT_HOLD_MS = 200; // invisible right after a snap...
const TELEPORT_FADE_MS = 300; // ...then fades back in at the new spot

const noRaycast = () => null;

function lifecycleOpacity(peer: Peer, now: number): number {
  let o: number;
  if (peer.state === "entering") {
    o = Math.min(1, (now - peer.enteredAt) / ENTER_MS);
  } else if (peer.state === "leaving") {
    o = Math.max(0, 1 - (now - peer.leavingAt) / LEAVE_MS);
  } else {
    o = 1;
  }
  if (peer.teleportAt > 0) {
    const since = now - peer.teleportAt;
    if (since < TELEPORT_HOLD_MS) o = 0;
    else if (since < TELEPORT_HOLD_MS + TELEPORT_FADE_MS) {
      o = Math.min(o, (since - TELEPORT_HOLD_MS) / TELEPORT_FADE_MS);
    }
  }
  return o;
}

function RemotePeer({ peer }: { peer: Peer }) {
  const pose = useRef<AvatarPose>({
    x: peer.latest.s.x,
    z: peer.latest.s.z,
    headingDeg: peer.latest.s.h,
    speed: 0,
    turnRate: 0,
  });
  const last = useRef({
    x: peer.latest.s.x,
    z: peer.latest.s.z,
    h: peer.latest.s.h,
    t: 0,
  });
  const spriteRef = useRef<THREE.Sprite>(null);

  const label = useMemo(
    () =>
      makeTextTexture(peer.label, {
        color: "#2b2b2b",
        fontPx: 72,
        weight: "500",
        letterSpacing: 0.06,
        background: "#fbfaf7",
        border: peer.color,
      }),
    [peer.label, peer.color],
  );

  const spriteMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: label.texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [label],
  );

  // Gait is driven by rendered displacement, not the transmitted speed, so
  // remote legs move exactly when the remote body moves (SPEC 12.3).
  const getPose = () => {
    const now = performance.now();
    const p = interpolate(peer, now);
    const l = last.current;
    const dt = l.t > 0 ? (now - l.t) / 1000 : 0;
    if (dt > 0.001) {
      const planar = Math.hypot(p.x - l.x, p.z - l.z) / dt;
      const turn = (((p.h - l.h + 540) % 360) - 180) / dt;
      const a = Math.min(1, dt / 0.15);
      const dir = p.s < -0.05 ? -1 : 1;
      pose.current.speed +=
        (dir * Math.min(planar, 4) - pose.current.speed) * a;
      pose.current.turnRate += (turn - pose.current.turnRate) * a;
    }
    last.current = { x: p.x, z: p.z, h: p.h, t: now };
    pose.current.x = p.x;
    pose.current.z = p.z;
    pose.current.headingDeg = p.h;
    return pose.current;
  };

  const getOpacity = () => lifecycleOpacity(peer, performance.now());

  useFrame(() => {
    const s = spriteRef.current;
    if (!s) return;
    const p = pose.current;
    s.position.set(p.x, 2.12, p.z);
    const o = getOpacity();
    spriteMat.opacity = o;
    s.visible = o > 0.02;
  });

  const h = 0.3;
  return (
    <group>
      <AvatarBody getPose={getPose} tint={peer.color} getOpacity={getOpacity} />
      <sprite
        ref={spriteRef}
        material={spriteMat}
        scale={[h * label.aspect, h, 1]}
        raycast={noRaycast}
      />
    </group>
  );
}

export default function RemoteAvatars() {
  const [ids, setIds] = useState<string[]>([]);
  const lastSync = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastSync.current < 250) return;
    lastSync.current = now;
    const client = presenceStore.client;
    // The protocol layer owns the render cap; bodies exist only for
    // peers it marked rendered.
    const current = client
      ? [...client.peers.values()].filter((p) => p.rendered).map((p) => p.id)
      : [];
    setIds((prev) =>
      prev.length === current.length && prev.every((id, i) => id === current[i])
        ? prev
        : current,
    );
  });

  const client = presenceStore.client;
  if (!client) return null;
  return (
    <>
      {ids.map((id) => {
        const peer = client.peers.get(id);
        return peer ? <RemotePeer key={id} peer={peer} /> : null;
      })}
    </>
  );
}
