"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Painting from "./Painting";
import { makeTextTexture } from "./textures";
import {
  buildLayout,
  DEFAULT_SPAWN,
  FACE_HEADINGS,
  ROOM,
  WALL_DEFS,
  WALL_LABELS,
  WALL_TINTS,
  type MuseumStory,
  type WallId,
} from "./layout";

function setHud(attrs: Record<string, string>) {
  const hud = document.getElementById("museum-hud");
  if (!hud) return;
  for (const [k, v] of Object.entries(attrs)) hud.setAttribute(k, v);
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const face = new URLSearchParams(window.location.search).get(
      "face",
    ) as WallId | null;
    let { x, z, headingDeg } = DEFAULT_SPAWN;
    if (face && face in FACE_HEADINGS) {
      x = 0;
      z = 0;
      headingDeg = FACE_HEADINGS[face];
    }
    camera.position.set(x, ROOM.eye, z);
    camera.rotation.set(0, -THREE.MathUtils.degToRad(headingDeg), 0, "YXZ");
    setHud({
      "data-x": x.toFixed(2),
      "data-z": z.toFixed(2),
      "data-heading": ((headingDeg % 360) + 360 % 360).toFixed(1),
    });
  }, [camera]);
  return null;
}

function RoomShell() {
  const { half, height } = ROOM;
  const wallMat = { color: "#16141d", roughness: 0.92, metalness: 0.05 };
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ROOM.size, ROOM.size]} />
        <meshStandardMaterial color="#0d0c13" roughness={0.4} metalness={0.25} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[ROOM.size, ROOM.size]} />
        <meshStandardMaterial color="#07070b" roughness={1} />
      </mesh>
      {/* walls: north, east, south, west */}
      <mesh position={[0, height / 2, -half]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[half, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[0, height / 2, half]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[-half, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
    </group>
  );
}

function WallLabel({ wall }: { wall: WallId }) {
  const label = useMemo(
    () =>
      makeTextTexture(WALL_LABELS[wall], {
        color: WALL_TINTS[wall],
        fontPx: 110,
        weight: "600",
        letterSpacing: 0.34,
      }),
    [wall],
  );
  const h = 0.42;
  const w = h * label.aspect;
  const def = WALL_DEFS[wall];
  return (
    <group position={def.point(0, 4.35)} rotation={[0, def.rotationY, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={label.texture} transparent opacity={0.92} />
      </mesh>
      <pointLight position={[0, -0.4, 1.2]} intensity={2.2} distance={4} color={WALL_TINTS[wall]} />
    </group>
  );
}

function Paintings({
  stories,
  onLoaded,
}: {
  stories: MuseumStory[];
  onLoaded: () => void;
}) {
  const layout = useMemo(() => buildLayout(stories), [stories]);
  const hungs = useMemo(
    () => (Object.keys(layout.walls) as WallId[]).flatMap((w) => layout.walls[w]),
    [layout],
  );
  const textures = useLoader(
    THREE.TextureLoader,
    hungs.map((h) => h.story.coverThumb),
  );

  useEffect(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
  }, [textures]);

  useEffect(() => {
    setHud({
      "data-wall-roman": layout.slugsByWall.roman,
      "data-wall-ramayana": layout.slugsByWall.ramayana,
      "data-wall-mahabharata": layout.slugsByWall.mahabharata,
      "data-wall-curator": layout.slugsByWall.curator,
      "data-loaded": "true",
    });
    onLoaded();
  }, [layout, onLoaded]);

  return (
    <group>
      {hungs.map((hung, i) => (
        <Painting key={hung.story.slug + i} hung={hung} texture={textures[i]} />
      ))}
      {(["roman", "ramayana", "mahabharata"] as WallId[]).map((w) =>
        layout.walls[w].length > 0 ? <WallLabel key={w} wall={w} /> : null,
      )}
    </group>
  );
}

export default function MuseumRoom({ stories }: { stories: MuseumStory[] }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0">
      <div
        id="museum-hud"
        data-loaded="false"
        data-focused=""
        data-x=""
        data-z=""
        data-heading=""
        data-wall-roman=""
        data-wall-ramayana=""
        data-wall-mahabharata=""
        data-wall-curator=""
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(100%)",
        }}
      />
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 80 }}
      >
        <color attach="background" args={["#0a0a0f"]} />
        <fog attach="fog" args={["#0a0a0f", 22, 45]} />
        <ambientLight intensity={0.35} color="#8d92c4" />
        <CameraRig />
        <RoomShell />
        <Suspense fallback={null}>
          <Paintings stories={stories} onLoaded={() => setLoaded(true)} />
        </Suspense>
      </Canvas>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--color-bg)] transition-opacity duration-700 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-sm tracking-[0.25em] text-[var(--color-text-muted)] uppercase">
          Entering the museum…
        </p>
      </div>
    </div>
  );
}
