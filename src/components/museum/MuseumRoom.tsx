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
import CameraRig, { localBodyOpacity } from "./CameraRig";
import AvatarBody from "./AvatarBody";
import {
  initCamMode,
  playerStore,
  setCamMode,
  subscribeCamMode,
} from "./playerStore";
import { focusStore } from "./focusStore";
import PresenceManager from "./presence/PresenceManager";
import RemoteAvatars from "./RemoteAvatars";
import {
  makeFloorTexture,
  makePlacardTexture,
  makeTextTexture,
  makeVeilTexture,
} from "./textures";
import {
  buildLayout,
  CURATOR,
  ROOM,
  WALL_DEFS,
  WALL_LABELS,
  WALL_TINTS,
  WALL_TINTS_DARK,
  type MuseumStory,
  type WallId,
} from "./layout";

function setHud(attrs: Record<string, string>) {
  const hud = document.getElementById("museum-hud");
  if (!hud) return;
  for (const [k, v] of Object.entries(attrs)) hud.setAttribute(k, v);
}

const HINT_KEY = "museum.hintSeen.v1";

function HintOverlay({ coarse }: { coarse: boolean }) {
  // Client-only component: decide synchronously so the focus prompt never
  // sees a false hintVisible window between mount and a state flip.
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(HINT_KEY);
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }, []);

  useEffect(() => {
    focusStore.hintVisible = show;
    return () => {
      focusStore.hintVisible = false;
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onKey = () => dismiss();
    const onWheel = () => dismiss();
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      // Pressing the on-screen movement cluster counts as "got it" too.
      if (
        e.target instanceof Element &&
        e.target.closest("#museum-touch-controls")
      ) {
        dismiss();
        return;
      }
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      // A real drag (not a stray tap) counts as "got it, I can move".
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5)
        dismiss();
    };
    const onUp = () => {
      downAt = null;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [show, dismiss]);

  if (!show) return null;
  return (
    <div
      id="museum-hint"
      className="absolute bottom-40 left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-border)] bg-black/60 px-5 py-2.5 backdrop-blur sm:bottom-8"
    >
      <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">
        {coarse ? (
          <>
            <span className="text-[var(--color-text)]">Hold the controls</span>{" "}
            to move · <span className="text-[var(--color-text)]">drag</span> to
            look around ·{" "}
            <span className="text-[var(--color-text)]">tap a painting</span> to
            view it, tap again to open
          </>
        ) : (
          <>
            <span className="text-[var(--color-text)]">Arrow keys</span> or{" "}
            <span className="text-[var(--color-text)]">scroll</span> to walk ·{" "}
            <span className="text-[var(--color-text)]">drag</span> to look
            around · <span className="text-[var(--color-text)]">Enter</span> to
            view a painting ·{" "}
            <span className="text-[var(--color-text)]">Esc</span> to step back
          </>
        )}
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
  // Unlit, untone-mapped gallery white: walls must be the brightest large
  // surface, like the reference photo (taste audit finding 1).
  const wallMat = { color: "#f2f1ed", toneMapped: false };
  const floor = useMemo(() => makeFloorTexture(), []);
  const veil = useMemo(() => makeVeilTexture(), []);
  return (
    <group>
      {/* floor: light polished concrete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ROOM.size, ROOM.size]} />
        <meshStandardMaterial map={floor} roughness={0.3} metalness={0.08} />
      </mesh>
      {/* ceiling: the veil, unlit so it reads as the skylight */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[ROOM.size, ROOM.size]} />
        <meshBasicMaterial map={veil} toneMapped={false} />
      </mesh>
      {/* walls: north, east, south, west */}
      <mesh position={[0, height / 2, -half]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshBasicMaterial {...wallMat} />
      </mesh>
      <mesh position={[half, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshBasicMaterial {...wallMat} />
      </mesh>
      <mesh position={[0, height / 2, half]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshBasicMaterial {...wallMat} />
      </mesh>
      <mesh position={[-half, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM.size, height]} />
        <meshBasicMaterial {...wallMat} />
      </mesh>
    </group>
  );
}

function WallLabel({ wall, t = 0 }: { wall: WallId; t?: number }) {
  const label = useMemo(
    () =>
      makeTextTexture(WALL_LABELS[wall], {
        color: WALL_TINTS_DARK[wall],
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
        <meshBasicMaterial map={label.texture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function CuratorPlacard() {
  const plate = useMemo(() => makePlacardTexture(), []);
  const w = CURATOR.placardW;
  const h = w / plate.aspect;
  const def = WALL_DEFS.curator;
  return (
    <group
      position={def.point(CURATOR.placardT, CURATOR.placardY)}
      rotation={[0, def.rotationY, 0]}
    >
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.06]} />
        <meshStandardMaterial color="#26221e" metalness={0.1} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={plate.texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Gaze focus (SPEC 4.1): whatever you point at focuses, no distance gate.
const FOCUS_AZ_GATE = 12; // deg off view center
const FOCUS_ELEV_WEIGHT = 0.5;

function FocusManager({
  hungs,
  registry,
}: {
  hungs: HungPaintingList;
  registry: Map<string, (focused: boolean) => void>;
}) {
  const current = useRef("");
  const tapAnchor = useRef<{ x: number; z: number } | null>(null);

  useFrame(() => {
    // The aim ray is the player's (SPEC 11.4), independent of camera mode.
    const cx = playerStore.x;
    const cz = playerStore.z;
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
    const heading = playerStore.headingDeg;
    const pitchDeg = playerStore.pitchDeg;
    let best = "";
    let bestTitle = "";
    let bestScore = Infinity;
    let bestDist = Infinity;
    for (const h of hungs) {
      const dx = h.position[0] - cx;
      const dz = h.position[2] - cz;
      const dist = Math.hypot(dx, dz);
      const dirAngle = THREE.MathUtils.radToDeg(Math.atan2(dx, -dz));
      const azDiff = Math.abs(
        ((dirAngle - heading) % 360 + 540) % 360 - 180,
      );
      if (azDiff > FOCUS_AZ_GATE) continue;
      const elevAngle = THREE.MathUtils.radToDeg(
        Math.atan2(h.position[1] - ROOM.eye, dist),
      );
      const elevDiff = Math.abs(elevAngle - pitchDeg);
      const score = azDiff + FOCUS_ELEV_WEIGHT * elevDiff;
      if (
        score < bestScore - 1e-3 ||
        (Math.abs(score - bestScore) <= 1e-3 && dist < bestDist)
      ) {
        bestScore = score;
        bestDist = dist;
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
    // Visibility runs every frame: the prompt stays out of the hint's way
    // and appears as soon as the hint dismisses, without a focus change.
    const prompt = document.getElementById("museum-prompt");
    if (prompt) {
      prompt.style.display =
        best && !focusStore.hintVisible ? "flex" : "none";
    }
    if (best === current.current) return;
    registry.get(current.current)?.(false);
    registry.get(best)?.(true);
    current.current = best;
    document.getElementById("museum-hud")?.setAttribute("data-focused", best);
    const title = document.getElementById("museum-prompt-title");
    if (prompt && title && best) {
      title.textContent = bestTitle;
      const tradition = hungs.find((h) => h.story.slug === best)?.story
        .tradition;
      prompt.style.borderColor = (tradition && WALL_TINTS[tradition]) || "";
    }
  });
  return null;
}

type HungPaintingList = ReturnType<typeof buildLayout>["walls"][WallId];

// Fires onReady only after the textured room has actually been drawn a few
// times, so the loading plate fades into a finished frame instead of
// hard-cutting from black (taste audit finding 11).
function RevealAfterFrames({
  onReady,
  frames = 6,
}: {
  onReady: () => void;
  frames?: number;
}) {
  const count = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    count.current += 1;
    if (count.current >= frames) {
      done.current = true;
      onReady();
    }
  });
  return null;
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
  const registry = useMemo(
    () => new Map<string, (focused: boolean) => void>(),
    [],
  );
  const register = useCallback(
    (slug: string, fn: (focused: boolean) => void) => {
      registry.set(slug, fn);
      // FocusManager may have focused this painting before it registered
      // (first load); sync so the highlight matches data-focused.
      const focused = document
        .getElementById("museum-hud")
        ?.getAttribute("data-focused");
      fn(slug === focused);
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
  }, [layout]);

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
      <RevealAfterFrames onReady={onLoaded} />
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

// "N in the room" pill (SPEC 12.5): the only UI presence adds, and only
// with company. Counts you plus rendered peers, driven by the HUD attr.
function PresenceChip() {
  const [peers, setPeers] = useState(0);
  useEffect(() => {
    const hud = document.getElementById("museum-hud");
    if (!hud) return;
    const read = () =>
      setPeers(parseInt(hud.getAttribute("data-peers") || "0", 10) || 0);
    read();
    const mo = new MutationObserver(read);
    mo.observe(hud, { attributes: true, attributeFilter: ["data-peers"] });
    return () => mo.disconnect();
  }, []);
  if (peers < 1) return null;
  return (
    <div
      id="museum-presence-count"
      className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[var(--color-border)] bg-black/70 px-3.5 py-1.5 text-xs text-[var(--color-text)] backdrop-blur sm:top-5 sm:text-sm"
    >
      {peers + 1} in the room
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
  const [coarse, setCoarse] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setGlOk(webglAvailable());
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    initCamMode();
    // Known before any frame renders: if the hint is going to show, the
    // prompt must never flash over it during the load reveal.
    try {
      focusStore.hintVisible = !localStorage.getItem(HINT_KEY);
    } catch {
      focusStore.hintVisible = true;
    }
  }, []);

  const [camMode, setCamModeState] = useState(playerStore.camMode);
  useEffect(
    () =>
      subscribeCamMode(() => {
        setCamModeState(playerStore.camMode);
      }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyV") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      setCamMode(playerStore.camMode === "third" ? "first" : "third");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
            The collection is still open. Browse every story in the flat
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
        data-pitch=""
        data-net=""
        data-peers="0"
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
        <color attach="background" args={["#e9e8e4"]} />
        <hemisphereLight color="#ffffff" groundColor="#cfceca" intensity={1.25} />
        <ambientLight intensity={0.6} color="#fffdf8" />
        <WalkControls />
        <CameraRig />
        <AvatarBody getPose={() => playerStore} getOpacity={localBodyOpacity} />
        <RemoteAvatars />
        <RoomShell />
        <Suspense fallback={null}>
          <Paintings stories={stories} onLoaded={() => setLoaded(true)} />
        </Suspense>
      </Canvas>
      <PresenceManager loaded={loaded} />
      <PresenceChip />
      {loaded && <HintOverlay coarse={coarse} />}
      {loaded && <TouchControls />}
      {loaded && (
        <button
          id="museum-cam-toggle"
          aria-label="Switch camera view"
          onClick={() =>
            setCamMode(playerStore.camMode === "third" ? "first" : "third")
          }
          className="absolute top-16 right-4 z-10 rounded-full border border-[var(--color-border)] bg-black/70 px-3.5 py-1.5 text-xs text-[var(--color-text)] backdrop-blur transition-colors hover:border-[var(--color-accent-dim)] hover:text-[var(--color-accent)] sm:top-[4.25rem] sm:right-5 sm:text-sm"
        >
          {camMode === "third" ? "First person (V)" : "Third person (V)"}
        </button>
      )}
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
          {coarse ? (
            <>
              · <span className="text-[var(--color-accent)]">Tap</span> to view
            </>
          ) : (
            <>
              · Press <span className="text-[var(--color-accent)]">Enter</span>{" "}
              to view
            </>
          )}
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
