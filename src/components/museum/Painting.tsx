"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeTextTexture } from "./textures";
import type { HungPainting } from "./layout";

export default function Painting({
  hung,
  texture,
}: {
  hung: HungPainting;
  texture: THREE.Texture;
}) {
  const { width, height, position, rotationY, story } = hung;
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  const placard = useMemo(
    () =>
      makeTextTexture(story.title, {
        color: "#c9c9d8",
        fontPx: 48,
        weight: "400",
        letterSpacing: 0.04,
      }),
    [story.title],
  );
  const placardH = 0.14;
  const placardW = Math.min(width * 0.85, placardH * placard.aspect);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* frame */}
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[width + 0.28, height + 0.28, 0.1]} />
        <meshStandardMaterial color="#4a3a22" metalness={0.55} roughness={0.45} />
      </mesh>
      {/* canvas */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0} />
      </mesh>
      {/* placard */}
      <mesh position={[0, -(height / 2 + 0.28), 0.012]}>
        <planeGeometry args={[placardW, placardH]} />
        <meshBasicMaterial map={placard.texture} transparent opacity={0.9} />
      </mesh>
      {/* picture light */}
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <spotLight
        ref={spotRef}
        position={[0, height / 2 + 1.6, 2.1]}
        angle={0.62}
        penumbra={0.75}
        intensity={26}
        distance={9}
        decay={1.6}
        color="#ffe2b0"
      />
    </group>
  );
}
