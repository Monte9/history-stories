"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeTextTexture } from "./textures";
import { focusStore } from "./focusStore";
import type { HungPainting } from "./layout";

const SPOT_INTENSITY = 26;
const SPOT_FOCUSED = 42;

export default function Painting({
  hung,
  texture,
  onRegister,
  onUnregister,
}: {
  hung: HungPainting;
  texture: THREE.Texture;
  onRegister?: (slug: string, setFocus: (focused: boolean) => void) => void;
  onUnregister?: (slug: string) => void;
}) {
  const { width, height, position, rotationY, story } = hung;
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const frameMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  useEffect(() => {
    const setFocus = (focused: boolean) => {
      if (frameMatRef.current) {
        frameMatRef.current.emissive.set(focused ? "#9a7a36" : "#000000");
        frameMatRef.current.emissiveIntensity = focused ? 0.85 : 0;
      }
      if (spotRef.current) {
        spotRef.current.intensity = focused ? SPOT_FOCUSED : SPOT_INTENSITY;
      }
    };
    onRegister?.(story.slug, setFocus);
    return () => onUnregister?.(story.slug);
  }, [story.slug, onRegister, onUnregister]);

  const placard = useMemo(
    () =>
      makeTextTexture(story.title, {
        color: "#e6e6f2",
        fontPx: 48,
        weight: "400",
        letterSpacing: 0.04,
        background: "rgba(10, 9, 14, 0.85)",
      }),
    [story.title],
  );
  const placardH = 0.2;
  const placardW = Math.min(width * 0.95, placardH * placard.aspect);

  const badge = useMemo(
    () =>
      hung.badge
        ? makeTextTexture(hung.badge, {
            color: "#171005",
            fontPx: 56,
            weight: "700",
            letterSpacing: 0.12,
            background: "#e7b54a",
          })
        : null,
    [hung.badge],
  );

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        // First tap focuses; tapping the focused painting opens it.
        const focused = document
          .getElementById("museum-hud")
          ?.getAttribute("data-focused");
        if (focused === story.slug) {
          focusStore.openStory?.(story.slug);
        } else {
          focusStore.tapSlug = story.slug;
        }
      }}
    >
      {/* frame */}
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[width + 0.28, height + 0.28, 0.1]} />
        <meshStandardMaterial
          ref={frameMatRef}
          color="#4a3a22"
          metalness={0.55}
          roughness={0.45}
        />
      </mesh>
      {/* canvas */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0} />
      </mesh>
      {/* placard */}
      <mesh position={[0, -(height / 2 + 0.32), 0.012]}>
        <planeGeometry args={[placardW, placardH]} />
        <meshBasicMaterial map={placard.texture} transparent opacity={0.95} />
      </mesh>
      {/* badge tag */}
      {badge && (
        <mesh
          position={[width / 2 - 0.25, height / 2 + 0.26, 0.012]}
          rotation={[0, 0, 0.06]}
        >
          <planeGeometry args={[0.22 * badge.aspect, 0.22]} />
          <meshBasicMaterial map={badge.texture} />
        </mesh>
      )}
      {/* picture light */}
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <spotLight
        ref={spotRef}
        position={[0, height / 2 + 1.6, 2.1]}
        angle={0.62}
        penumbra={0.75}
        intensity={SPOT_INTENSITY}
        distance={9}
        decay={1.6}
        color="#ffe2b0"
      />
    </group>
  );
}
