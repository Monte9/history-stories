"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { makeTextTexture } from "./textures";
import { focusStore } from "./focusStore";
import { WALL_TINTS, type HungPainting } from "./layout";

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
  const outlineRef = useRef<THREE.Mesh>(null);
  const canvasMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    const setFocus = (focused: boolean) => {
      if (outlineRef.current) outlineRef.current.visible = focused;
      if (canvasMatRef.current) {
        // Slight lift so the focused canvas reads brighter in daylight.
        canvasMatRef.current.emissive.set(focused ? "#ffffff" : "#000000");
        canvasMatRef.current.emissiveMap = focused ? texture : null;
        canvasMatRef.current.emissiveIntensity = focused ? 0.35 : 0;
        canvasMatRef.current.needsUpdate = true;
      }
    };
    onRegister?.(story.slug, setFocus);
    return () => onUnregister?.(story.slug);
  }, [story.slug, texture, onRegister, onUnregister]);

  const placard = useMemo(
    () =>
      makeTextTexture(story.title, {
        color: "#2b2b2b",
        fontPx: 48,
        weight: "400",
        letterSpacing: 0.04,
        background: "#fbfaf7",
        border: "#d8d5cd",
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

  // Thin gallery frame (SPEC 2.2): ~0.07 border per side, shallow depth.
  const frameW = width + 0.14;
  const frameH = height + 0.14;

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
      {/* focus outline: tradition tint, visible against white walls */}
      <mesh ref={outlineRef} visible={false} position={[0, 0, -0.05]}>
        <planeGeometry args={[frameW + 0.16, frameH + 0.16]} />
        <meshBasicMaterial color={WALL_TINTS[story.tradition]} />
      </mesh>
      {/* frame */}
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[frameW, frameH, 0.06]} />
        <meshStandardMaterial color="#26221e" metalness={0.1} roughness={0.6} />
      </mesh>
      {/* canvas */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          ref={canvasMatRef}
          map={texture}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      {/* placard */}
      <mesh position={[0, -(height / 2 + 0.32), 0.012]}>
        <planeGeometry args={[placardW, placardH]} />
        <meshBasicMaterial map={placard.texture} />
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
    </group>
  );
}
