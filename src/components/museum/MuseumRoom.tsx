"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import Painting from "./Painting";
import WalkControls, {
  lockSaves,
  pressAction,
  releaseAction,
  saveCamera,
  type Action,
} from "./WalkControls";
import { focusStore } from "./focusStore";
import { makePlacardTexture, makeTextTexture } from "./textures";
import {
  buildLayout,
  CURATOR,
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

const HINT_KEY = "museum.hintSeen.v1";

function HintOverlay() {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const onKey = () => dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, dismiss]);

  if (!show) return null;
  return (
    <div
      id="museum-hint"
      className="absolute bottom-8 left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-border)] bg-black/60 px-5 py-2.5 backdrop-blur"
    >
      <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">
        <span className="text-[var(--color-text)]">Arrow keys</span> to walk
        and turn · <span className="text-[var(--color-text)]">Enter</span> to
        view a painting ·{" "}
        <span className="text-[var(--color-text)]">Esc</span> to step back
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss hint"
        className="rounded-full px-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        ×
      </button>
    </div>
  );
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

function WallLabel({ wall, t = 0 }: { wall: WallId; t?: number }) {
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
    <group position={def.point(t, 4.35)} rotation={[0, def.rotationY, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={label.texture} transparent opacity={0.92} />
      </mesh>
      <pointLight position={[0, -0.4, 1.2]} intensity={3} distance={4.5} color={WALL_TINTS[wall]} />
    </group>
  );
}

function CuratorPlacard() {
  const plate = useMemo(() => makePlacardTexture(), []);
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);
  const w = CURATOR.placardW;
  const h = w / plate.aspect;
  const def = WALL_DEFS.curator;
  return (
    <group
      position={def.point(CURATOR.placardT, CURATOR.placardY)}
      rotation={[0, def.rotationY, 0]}
    >
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[w + 0.3, h + 0.3, 0.1]} />
        <meshStandardMaterial color="#4a3a22" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={plate.texture} roughness={0.8} metalness={0} />
      </mesh>
      <object3D ref={targetRef} position={[0, 0, 0]} />
      <spotLight
        ref={spotRef}
        position={[0, h / 2 + 1.6, 2.1]}
        angle={0.7}
        penumbra={0.7}
        intensity={34}
        distance={9}
        decay={1.6}
        color="#ffe2b0"
      />
    </group>
  );
}

// Dim cool fills so the corners never go pitch black between light pools.
function CornerFills() {
  const r = ROOM.half - 3;
  return (
    <>
      {[
        [r, r],
        [r, -r],
        [-r, r],
        [-r, -r],
      ].map(([x, z], i) => (
        <pointLight
          key={i}
          position={[x, 3.4, z]}
          intensity={1.8}
          distance={10}
          decay={1.8}
          color="#565478"
        />
      ))}
    </>
  );
}

const FOCUS_DISTANCE = 3.0;
const FOCUS_HALF_ANGLE = 35;

function FocusManager({
  hungs,
  registry,
}: {
  hungs: HungPaintingList;
  registry: Map<string, (focused: boolean) => void>;
}) {
  const camera = useThree((s) => s.camera);
  const current = useRef("");
  const tapAnchor = useRef<{ x: number; z: number } | null>(null);

  useFrame(() => {
    const cx = camera.position.x;
    const cz = camera.position.z;
    // Walking more than half a unit clears a tap-focus override.
    if (focusStore.tapSlug) {
      if (!tapAnchor.current) tapAnchor.current = { x: cx, z: cz };
      else if (
        Math.hypot(cx - tapAnchor.current.x, cz - tapAnchor.current.z) > 0.5
      ) {
        focusStore.tapSlug = "";
        tapAnchor.current = null;
      }
    } else {
      tapAnchor.current = null;
    }
    const heading = -THREE.MathUtils.radToDeg(camera.rotation.y);
    let best = "";
    let bestTitle = "";
    let bestAngle = Infinity;
    for (const h of hungs) {
      const dx = h.position[0] - cx;
      const dz = h.position[2] - cz;
      const dist = Math.hypot(dx, dz);
      if (dist >= FOCUS_DISTANCE) continue;
      const dirAngle = THREE.MathUtils.radToDeg(Math.atan2(dx, -dz));
      const diff = Math.abs(
        ((dirAngle - heading) % 360 + 540) % 360 - 180,
      );
      if (diff > FOCUS_HALF_ANGLE) continue;
      if (diff < bestAngle) {
        bestAngle = diff;
        best = h.story.slug;
        bestTitle = h.story.title;
      }
    }
    if (focusStore.tapSlug) {
      const tapped = hungs.find((h) => h.story.slug === focusStore.tapSlug);
      if (tapped) {
        best = tapped.story.slug;
        bestTitle = tapped.story.title;
      }
    }
    if (best === current.current) return;
    registry.get(current.current)?.(false);
    registry.get(best)?.(true);
    current.current = best;
    document.getElementById("museum-hud")?.setAttribute("data-focused", best);
    const prompt = document.getElementById("museum-prompt");
    const title = document.getElementById("museum-prompt-title");
    if (prompt && title) {
      if (best) {
        title.textContent = bestTitle;
        const tradition = hungs.find((h) => h.story.slug === best)?.story
          .tradition;
        prompt.style.borderColor =
          (tradition && WALL_TINTS[tradition]) || "";
        prompt.style.display = "flex";
      } else {
        prompt.style.display = "none";
      }
    }
  });
  return null;
}

type HungPaintingList = ReturnType<typeof buildLayout>["walls"][WallId];

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
  const registry = useMemo(
    () => new Map<string, (focused: boolean) => void>(),
    [],
  );
  const register = useCallback(
    (slug: string, fn: (focused: boolean) => void) => {
      registry.set(slug, fn);
    },
    [registry],
  );
  const unregister = useCallback(
    (slug: string) => {
      registry.delete(slug);
    },
    [registry],
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
        <Painting
          key={hung.story.slug + i}
          hung={hung}
          texture={textures[i]}
          onRegister={register}
          onUnregister={unregister}
        />
      ))}
      {(["roman", "ramayana", "mahabharata"] as WallId[]).map((w) =>
        layout.walls[w].length > 0 ? <WallLabel key={w} wall={w} /> : null,
      )}
      {layout.walls.curator.length > 0 && (
        <WallLabel wall="curator" t={CURATOR.labelT} />
      )}
      <CuratorPlacard />
      <FocusManager hungs={hungs} registry={registry} />
    </group>
  );
}

function TouchControls() {
  const bind = (action: Action) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // synthetic/untracked pointers can't be captured; press still counts
      }
      pressAction(action);
    },
    onPointerUp: () => releaseAction(action),
    onPointerLeave: () => releaseAction(action),
    onPointerCancel: () => releaseAction(action),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const cls =
    "flex h-12 w-12 touch-none items-center justify-center rounded-full border border-[var(--color-border)] bg-black/55 text-lg text-[var(--color-text)] backdrop-blur select-none active:border-[var(--color-accent-dim)] active:bg-black/75";
  return (
    <div
      id="museum-touch-controls"
      className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 gap-3 sm:hidden"
    >
      <button aria-label="Turn left" className={cls} {...bind("left")}>
        ⟲
      </button>
      <button aria-label="Walk forward" className={cls} {...bind("fwd")}>
        ▲
      </button>
      <button aria-label="Walk back" className={cls} {...bind("back")}>
        ▼
      </button>
      <button aria-label="Turn right" className={cls} {...bind("right")}>
        ⟳
      </button>
    </div>
  );
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
}

export default function MuseumRoom({ stories }: { stories: MuseumStory[] }) {
  const [loaded, setLoaded] = useState(false);
  // null = not probed yet (SSR-safe); the probe runs before mounting the canvas.
  const [glOk, setGlOk] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    setGlOk(webglAvailable());
  }, []);

  const openStory = useCallback(
    (slug: string) => {
      // Persist the camera synchronously so Escape returns here exactly.
      const hud = document.getElementById("museum-hud");
      const x = parseFloat(hud?.getAttribute("data-x") || "");
      const z = parseFloat(hud?.getAttribute("data-z") || "");
      const heading = parseFloat(hud?.getAttribute("data-heading") || "");
      if (!Number.isNaN(x) && !Number.isNaN(z) && !Number.isNaN(heading)) {
        saveCamera(x, z, heading);
        lockSaves();
      }
      router.push(`/${slug}`);
    },
    [router],
  );

  useEffect(() => {
    focusStore.openStory = openStory;
    focusStore.tapSlug = "";
    return () => {
      focusStore.openStory = null;
    };
  }, [openStory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const slug = document
        .getElementById("museum-hud")
        ?.getAttribute("data-focused");
      if (slug) {
        e.preventDefault();
        openStory(slug);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openStory]);

  if (glOk === false) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="mb-3 text-lg text-[var(--color-text)]">
            This room needs WebGL, which your browser has turned off.
          </p>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            The collection is still open — browse every story in the flat
            gallery instead.
          </p>
          <a
            href="/gallery"
            className="inline-block rounded-full border border-[var(--color-accent-dim)] px-5 py-2 text-sm text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-glow)]"
          >
            Gallery view
          </a>
        </div>
      </div>
    );
  }
  if (glOk === null) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm tracking-[0.25em] text-[var(--color-text-muted)] uppercase">
          Entering the museum…
        </p>
      </div>
    );
  }

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
        <ambientLight intensity={0.24} color="#8d92c4" />
        <CornerFills />
        <WalkControls />
        <RoomShell />
        <Suspense fallback={null}>
          <Paintings stories={stories} onLoaded={() => setLoaded(true)} />
        </Suspense>
      </Canvas>
      {loaded && <HintOverlay />}
      {loaded && <TouchControls />}
      <div
        id="museum-prompt"
        style={{ display: "none" }}
        aria-live="polite"
        onClick={() => {
          const slug = document
            .getElementById("museum-hud")
            ?.getAttribute("data-focused");
          if (slug) focusStore.openStory?.(slug);
        }}
        className="absolute bottom-8 left-1/2 z-20 max-w-[92vw] -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-[var(--color-accent-dim)] bg-black/70 px-5 py-2.5 backdrop-blur"
      >
        <span
          id="museum-prompt-title"
          className="truncate text-sm font-medium text-[var(--color-text)]"
        />
        <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
          — Press <span className="text-[var(--color-accent)]">Enter</span> to
          view
        </span>
      </div>
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
