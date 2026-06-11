"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A procedural articulated human (SPEC 11.1-11.2): ~18 primitives posed per
// frame by a gait that is a pure function of speed, turn rate, phase, and
// time. No assets, no skeleton; joints are nested groups.

export interface AvatarPose {
  x: number;
  z: number;
  headingDeg: number;
  speed: number; // planar units/s
  turnRate: number; // deg/s
}

const STRIDE = 0.85; // units per step
const SKIN = "#c9a585";
const SHIRT = "#3a4250";
const TROUSERS = "#2a2723";
const SHOES = "#1a1816";

// Proportions for a 1.75-unit figure.
const HIP_Y = 0.92;
const THIGH = 0.42;
const CALF = 0.4;
const SHOULDER_Y = 1.44;
const UPPER_ARM = 0.3;
const FOREARM = 0.27;

const noRaycast = () => null;

function lerpTo(current: number, target: number, a: number) {
  return current + (target - current) * a;
}

interface Joints {
  root: THREE.Group;
  body: THREE.Group; // lean + bob, child of root
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  chest: THREE.Group;
}

function Leg({
  side,
  trousers,
  shoes,
  hipRef,
  kneeRef,
}: {
  side: 1 | -1;
  trousers: THREE.Material;
  shoes: THREE.Material;
  hipRef: (g: THREE.Group) => void;
  kneeRef: (g: THREE.Group) => void;
}) {
  return (
    <group ref={hipRef} position={[0.1 * side, HIP_Y, 0]}>
      <mesh
        position={[0, -THIGH / 2, 0]}
        material={trousers}
        raycast={noRaycast}
      >
        <capsuleGeometry args={[0.075, THIGH - 0.12, 4, 8]} />
      </mesh>
      <group ref={kneeRef} position={[0, -THIGH, 0]}>
        <mesh
          position={[0, -CALF / 2, 0]}
          material={trousers}
          raycast={noRaycast}
        >
          <capsuleGeometry args={[0.06, CALF - 0.1, 4, 8]} />
        </mesh>
        {/* foot, toe forward */}
        <mesh
          position={[0, -CALF - 0.04, -0.05]}
          material={shoes}
          raycast={noRaycast}
        >
          <boxGeometry args={[0.11, 0.08, 0.26]} />
        </mesh>
      </group>
    </group>
  );
}

function Arm({
  side,
  shirt,
  skin,
  shoulderRef,
  elbowRef,
}: {
  side: 1 | -1;
  shirt: THREE.Material;
  skin: THREE.Material;
  shoulderRef: (g: THREE.Group) => void;
  elbowRef: (g: THREE.Group) => void;
}) {
  return (
    <group ref={shoulderRef} position={[0.26 * side, SHOULDER_Y, 0]}>
      <mesh
        position={[0, -UPPER_ARM / 2, 0]}
        material={shirt}
        raycast={noRaycast}
      >
        <capsuleGeometry args={[0.055, UPPER_ARM - 0.09, 4, 8]} />
      </mesh>
      <group ref={elbowRef} position={[0, -UPPER_ARM, 0]}>
        <mesh
          position={[0, -FOREARM / 2, 0]}
          material={skin}
          raycast={noRaycast}
        >
          <capsuleGeometry args={[0.048, FOREARM - 0.09, 4, 8]} />
        </mesh>
        {/* hand */}
        <mesh
          position={[0, -FOREARM - 0.05, 0]}
          material={skin}
          raycast={noRaycast}
        >
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

export default function AvatarBody({
  getPose,
  tint,
  getOpacity,
}: {
  getPose: () => AvatarPose;
  tint?: string; // shirt color variant (remote visitors, SPEC 12.4)
  getOpacity?: () => number; // boom fade for the local body
}) {
  const joints = useRef<Partial<Joints>>({});
  const phase = useRef(0);
  const pose = useRef({
    hipL: 0,
    hipR: 0,
    kneeL: 0,
    kneeR: 0,
    shL: 0,
    shR: 0,
    elL: 0.15,
    elR: 0.15,
    lean: 0,
    bob: 0,
  });

  const materials = useMemo(() => {
    const make = (color: string) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0,
        transparent: true,
      });
    return {
      skin: make(SKIN),
      shirt: make(tint || SHIRT),
      trousers: make(TROUSERS),
      shoes: make(SHOES),
    };
  }, [tint]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const j = joints.current;
    if (!j.root || !j.body) return;
    const p = getPose();

    j.root.position.set(p.x, 0, p.z);
    j.root.rotation.y = -THREE.MathUtils.degToRad(p.headingDeg);

    const speed = Math.abs(p.speed);
    const walking = speed > 0.05;
    const turning = !walking && Math.abs(p.turnRate) > 30;
    const dir = p.speed >= 0 ? 1 : -1;

    // Phase: stride-locked while walking (feet cannot skate), a slow fixed
    // shuffle while turning in place.
    if (walking) phase.current += ((Math.PI * 2 * speed) / (STRIDE * 2)) * dt * dir;
    else if (turning) phase.current += Math.PI * 2 * 1.0 * dt;

    const t = pose.current;
    const ph = phase.current;
    const time = state.clock.elapsedTime;

    // Joint sign conventions: forward (toward local -z) is negative rotX for
    // hips/shoulders/elbows/lean; knees bend the calf backward, positive.
    let target;
    if (walking) {
      const amp = Math.min(1, speed / 3) * (dir > 0 ? 1 : 0.6);
      const swing = 0.56 * amp; // ~32deg
      const s = Math.sin(ph);
      target = {
        hipL: swing * s,
        hipR: -swing * s,
        kneeL: Math.max(0, Math.sin(ph - 1.2)) * 0.8 * amp,
        kneeR: Math.max(0, Math.sin(ph - 1.2 + Math.PI)) * 0.8 * amp,
        shL: -0.38 * amp * s,
        shR: 0.38 * amp * s,
        elL: -(0.25 + 0.15 * amp),
        elR: -(0.25 + 0.15 * amp),
        lean: -0.07 * (speed / 3) * dir,
        bob: 0.03 * amp * Math.sin(2 * ph),
      };
    } else if (turning) {
      const lift = Math.sin(ph);
      target = {
        hipL: Math.max(0, lift) * 0.12,
        hipR: Math.max(0, -lift) * 0.12,
        kneeL: Math.max(0, lift) * 0.3,
        kneeR: Math.max(0, -lift) * 0.3,
        shL: 0.05,
        shR: 0.05,
        elL: -0.18,
        elR: -0.18,
        lean: 0,
        bob: 0.01 * Math.abs(Math.sin(ph)),
      };
    } else {
      // Idle: relaxed stance with breathing and a slow weight sway.
      const breathe = Math.sin(time * Math.PI * 0.5);
      const sway = Math.sin(time * 0.4);
      target = {
        hipL: 0.02 * sway,
        hipR: -0.02 * sway,
        kneeL: 0.04,
        kneeR: 0.04,
        shL: 0.03 * breathe,
        shR: 0.03 * breathe,
        elL: -0.15,
        elR: -0.15,
        lean: -0.01,
        bob: 0.01 * breathe,
      };
    }

    // Blend toward targets (~180 ms) so walk/turn/idle transitions never snap.
    const a = Math.min(1, dt / 0.18);
    t.hipL = lerpTo(t.hipL, target.hipL, a);
    t.hipR = lerpTo(t.hipR, target.hipR, a);
    t.kneeL = lerpTo(t.kneeL, target.kneeL, a);
    t.kneeR = lerpTo(t.kneeR, target.kneeR, a);
    t.shL = lerpTo(t.shL, target.shL, a);
    t.shR = lerpTo(t.shR, target.shR, a);
    t.elL = lerpTo(t.elL, target.elL, a);
    t.elR = lerpTo(t.elR, target.elR, a);
    t.lean = lerpTo(t.lean, target.lean, a);
    t.bob = lerpTo(t.bob, target.bob, a);

    j.hipL!.rotation.x = t.hipL;
    j.hipR!.rotation.x = t.hipR;
    j.kneeL!.rotation.x = t.kneeL;
    j.kneeR!.rotation.x = t.kneeR;
    j.shoulderL!.rotation.x = t.shL;
    j.shoulderR!.rotation.x = t.shR;
    j.elbowL!.rotation.x = t.elL;
    j.elbowR!.rotation.x = t.elR;
    j.body.rotation.x = t.lean;
    j.body.position.y = t.bob;

    if (getOpacity) {
      const o = getOpacity();
      j.root.visible = o > 0.02;
      for (const m of Object.values(materials)) m.opacity = o;
    }
  });

  const setJ =
    (key: keyof Joints) =>
    (g: THREE.Group | null) => {
      if (g) (joints.current as Record<string, THREE.Group>)[key] = g;
    };

  return (
    <group ref={setJ("root")}>
      <group ref={setJ("body")}>
        {/* pelvis */}
        <mesh position={[0, HIP_Y + 0.02, 0]} material={materials.trousers} raycast={noRaycast}>
          <boxGeometry args={[0.3, 0.16, 0.18]} />
        </mesh>
        {/* torso */}
        <group ref={setJ("chest")}>
          <mesh position={[0, 1.22, 0]} material={materials.shirt} raycast={noRaycast}>
            <capsuleGeometry args={[0.17, 0.3, 4, 10]} />
          </mesh>
          {/* shoulders */}
          <mesh
            position={[0, SHOULDER_Y - 0.02, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={materials.shirt}
            raycast={noRaycast}
          >
            <capsuleGeometry args={[0.09, 0.32, 4, 8]} />
          </mesh>
        </group>
        {/* neck */}
        <mesh position={[0, 1.5, 0]} material={materials.skin} raycast={noRaycast}>
          <cylinderGeometry args={[0.05, 0.06, 0.09, 8]} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.64, 0]} material={materials.skin} raycast={noRaycast}>
          <capsuleGeometry args={[0.1, 0.06, 4, 10]} />
        </mesh>
        <Arm side={1} shirt={materials.shirt} skin={materials.skin} shoulderRef={setJ("shoulderL")} elbowRef={setJ("elbowL")} />
        <Arm side={-1} shirt={materials.shirt} skin={materials.skin} shoulderRef={setJ("shoulderR")} elbowRef={setJ("elbowR")} />
        <Leg side={1} trousers={materials.trousers} shoes={materials.shoes} hipRef={setJ("hipL")} kneeRef={setJ("kneeL")} />
        <Leg side={-1} trousers={materials.trousers} shoes={materials.shoes} hipRef={setJ("hipR")} kneeRef={setJ("kneeR")} />
      </group>
    </group>
  );
}
