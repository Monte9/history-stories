"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import AvatarBody, { type AvatarPose } from "./AvatarBody";
import { makeTextTexture } from "./textures";
import { presenceStore } from "./presence/presenceStore";
import { interpolate, type Peer } from "./presence/peers";
import { clampVariant } from "./avatarVariants";

// Remote visitors (SPEC 12.4-12.5): tinted bodies driven by interpolated
// peer state, billboard labels, staged enter/leave/teleport fades. Scenery
// only: never collides, never raycasts, never touches local state.

const ENTER_MS = 400;
const LEAVE_MS = 400;
const TELEPORT_HOLD_MS = 200; // invisible right after a snap...
const TELEPORT_FADE_MS = 300; // ...then fades back in at the new spot

const LABEL_Y = 2.12;
const LABEL_H_MAX = 0.3;
// Labels shrink with proximity and vanish point-blank, so a buddy walking
// beside you never wears a billboard across the frame (taste audit 2, #3).
const LABEL_H_PER_U = 0.09;
const LABEL_FADE_NEAR = 1.0; // fully gone at this camera distance...
const LABEL_FADE_FULL = 1.5; // ...fully visible beyond this

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

interface LabelEntry {
  peer: Peer;
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  aspect: number;
}

type LabelRegistry = Map<string, LabelEntry>;

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
        (dir * Math.min(planar, 8) - pose.current.speed) * a;
      pose.current.turnRate += (turn - pose.current.turnRate) * a;
    }
    last.current = { x: p.x, z: p.z, h: p.h, t: now };
    pose.current.x = p.x;
    pose.current.z = p.z;
    pose.current.headingDeg = p.h;
    return pose.current;
  };

  const getOpacity = () => lifecycleOpacity(peer, performance.now());

  return (
    <AvatarBody
      getPose={getPose}
      variant={clampVariant(peer.latest.s.v)}
      getOpacity={getOpacity}
    />
  );
}

function PeerLabel({
  peer,
  registry,
}: {
  peer: Peer;
  registry: LabelRegistry;
}) {
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

  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: label.texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [label],
  );

  useEffect(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    registry.set(peer.id, { peer, sprite, mat, aspect: label.aspect });
    return () => {
      registry.delete(peer.id);
    };
  }, [peer, registry, mat, label.aspect]);

  return (
    <sprite
      ref={spriteRef}
      material={mat}
      scale={[LABEL_H_MAX * label.aspect, LABEL_H_MAX, 1]}
      raycast={noRaycast}
    />
  );
}

const ndc = new THREE.Vector3();

// One pass for every label: distance-aware scale, near fade, and
// screen-space overlap suppression (nearer label wins; the farther one is
// hidden entirely rather than smearing into it — taste audit 2, #5).
function LabelManager({ registry }: { registry: LabelRegistry }) {
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const now = performance.now();
    const cam = camera as THREE.PerspectiveCamera;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const entries = [...registry.values()].map((e) => {
      const pose = interpolate(e.peer, now);
      const d = Math.hypot(
        pose.x - cam.position.x,
        LABEL_Y - cam.position.y,
        pose.z - cam.position.z,
      );
      return { ...e, pose, d };
    });
    entries.sort((a, b) => a.d - b.d);
    const kept: { x: number; y: number; hw: number; hh: number }[] = [];
    for (const e of entries) {
      const { sprite, mat, peer, pose, d, aspect } = e;
      const h = Math.min(LABEL_H_MAX, LABEL_H_PER_U * d);
      sprite.position.set(pose.x, LABEL_Y, pose.z);
      sprite.scale.set(h * aspect, h, 1);
      let o =
        lifecycleOpacity(peer, now) *
        THREE.MathUtils.clamp(
          (d - LABEL_FADE_NEAR) / (LABEL_FADE_FULL - LABEL_FADE_NEAR),
          0,
          1,
        );
      if (o > 0.02) {
        ndc.set(pose.x, LABEL_Y, pose.z).project(cam);
        if (ndc.z < 1 && Math.abs(ndc.x) < 1.3 && Math.abs(ndc.y) < 1.3) {
          const hh = h / 2 / (d * tanHalf);
          const hw = (h * aspect) / 2 / (d * tanHalf * cam.aspect);
          const overlaps = kept.some(
            (r) =>
              Math.abs(ndc.x - r.x) < hw + r.hw &&
              Math.abs(ndc.y - r.y) < hh + r.hh,
          );
          if (overlaps) o = 0;
          else kept.push({ x: ndc.x, y: ndc.y, hw, hh });
        }
      }
      mat.opacity = o;
      sprite.visible = o > 0.02;
    }
  });
  return null;
}

export default function RemoteAvatars() {
  const [ids, setIds] = useState<string[]>([]);
  const lastSync = useRef(0);
  const registry = useMemo<LabelRegistry>(() => new Map(), []);

  useFrame(() => {
    const now = performance.now();
    if (now - lastSync.current < 250) return;
    lastSync.current = now;
    const client = presenceStore.client;
    // The protocol layer owns the render cap; bodies exist only for
    // peers it marked rendered.
    // The key carries the variant so a peer pressing B remounts their body
    // with the new look.
    const current = client
      ? [...client.peers.values()]
          .filter((p) => p.rendered)
          .map((p) => `${p.id}:${clampVariant(p.latest.s.v)}`)
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
      {ids.map((key) => {
        const peer = client.peers.get(key.slice(0, key.lastIndexOf(":")));
        return peer ? (
          <group key={key}>
            <RemotePeer peer={peer} />
            <PeerLabel peer={peer} registry={registry} />
          </group>
        ) : null;
      })}
      <LabelManager registry={registry} />
    </>
  );
}
