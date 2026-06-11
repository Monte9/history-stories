import type { Story } from "@/lib/stories";

export type MuseumStory = Pick<
  Story,
  "slug" | "title" | "tradition" | "coverThumb" | "date"
>;

export type WallId = "roman" | "ramayana" | "mahabharata" | "curator";

export const ROOM = {
  size: 24,
  half: 12,
  height: 5,
  eye: 1.6,
  margin: 1.5, // camera keeps this distance from walls
  usableWall: 20,
};

export const DEFAULT_SPAWN = { x: -9.5, z: 0, headingDeg: 90 };

// Heading: 0 = facing Wall 1 (north, -z), increases clockwise (ArrowRight).
export const FACE_HEADINGS: Record<WallId, number> = {
  roman: 0,
  ramayana: 90,
  mahabharata: 180,
  curator: 270,
};

export const WALL_LABELS: Record<WallId, string> = {
  roman: "ROME",
  ramayana: "RAMAYANA",
  mahabharata: "MAHABHARATA",
  curator: "NEW ACQUISITIONS",
};

export const WALL_TINTS: Record<WallId, string> = {
  roman: "#f59e0b",
  ramayana: "#10b981",
  mahabharata: "#3b82f6",
  curator: "#c084fc",
};

const WALL_OFFSET = 0.08; // lift paintings off the wall plane to avoid z-fighting

interface WallDef {
  rotationY: number; // radians; orients a +z-facing plane into the room
  // Map (t along the wall left-to-right as seen from room center, y up) to world space.
  point: (t: number, y: number) => [number, number, number];
}

const D = ROOM.half - WALL_OFFSET;

export const WALL_DEFS: Record<WallId, WallDef> = {
  roman: { rotationY: 0, point: (t, y) => [t, y, -D] }, // north
  ramayana: { rotationY: -Math.PI / 2, point: (t, y) => [D, y, t] }, // east
  mahabharata: { rotationY: Math.PI, point: (t, y) => [-t, y, D] }, // south
  curator: { rotationY: Math.PI / 2, point: (t, y) => [-D, y, -t] }, // west
};

export interface HungPainting {
  story: MuseumStory;
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
  badge?: string; // small tag on the frame, e.g. "NEW"
}

// Wall 4 layout: entrance placard on the left half, New Acquisitions row right.
export const CURATOR = {
  placardT: -5.2,
  placardW: 4.6,
  placardY: 2.3,
  acquisitionTs: [3.0, 5.9, 8.8],
  acquisitionW: 2.4,
  labelT: 5.9,
};

// The 3 most recent stories by frontmatter date; slug (timestamped) breaks ties.
export function pickAcquisitions(stories: MuseumStory[]): MuseumStory[] {
  return [...stories]
    .filter((s) => s.coverThumb)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug),
    )
    .slice(0, 3);
}

const ASPECT = 1.875 / 3.0; // 16:10 cover aspect

// Spread n items across the usable wall, centered.
function spread(n: number): number[] {
  const s = ROOM.usableWall / n;
  return Array.from({ length: n }, (_, i) => -ROOM.usableWall / 2 + s * (i + 0.5));
}

export function layoutWall(stories: MuseumStory[], wall: WallId): HungPainting[] {
  const def = WALL_DEFS[wall];
  let hung = stories;
  let extra = 0;
  if (hung.length > 16) {
    extra = hung.length - 16;
    hung = hung.slice(0, 16);
  }
  void extra; // surfaced in the wall label by the caller when > 0

  const make = (
    story: MuseumStory,
    t: number,
    y: number,
    width: number,
  ): HungPainting => ({
    story,
    position: def.point(t, y),
    rotationY: def.rotationY,
    width,
    height: width * ASPECT,
  });

  if (hung.length <= 6) {
    const ts = spread(hung.length);
    return hung.map((s, i) => make(s, ts[i], 2.0, 3.0));
  }
  if (hung.length <= 8) {
    const width = Math.max(2.2, (ROOM.usableWall - (hung.length - 1) * 0.5) / hung.length);
    const ts = spread(hung.length);
    return hung.map((s, i) => make(s, ts[i], 2.0, width));
  }
  // Two rows.
  const top = hung.filter((_, i) => i % 2 === 0);
  const bottom = hung.filter((_, i) => i % 2 === 1);
  const tsTop = spread(top.length);
  const tsBottom = spread(bottom.length);
  return [
    ...top.map((s, i) => make(s, tsTop[i], 3.2, 2.2)),
    ...bottom.map((s, i) => make(s, tsBottom[i], 1.5, 2.2)),
  ];
}

export interface MuseumLayout {
  walls: Record<WallId, HungPainting[]>;
  slugsByWall: Record<WallId, string>;
}

export function buildLayout(stories: MuseumStory[]): MuseumLayout {
  const byTradition: Record<"roman" | "ramayana" | "mahabharata", MuseumStory[]> = {
    roman: [],
    ramayana: [],
    mahabharata: [],
  };
  for (const s of stories) {
    if (byTradition[s.tradition] && s.coverThumb) byTradition[s.tradition].push(s);
  }
  const curatorDef = WALL_DEFS.curator;
  const walls: Record<WallId, HungPainting[]> = {
    roman: layoutWall(byTradition.roman, "roman"),
    ramayana: layoutWall(byTradition.ramayana, "ramayana"),
    mahabharata: layoutWall(byTradition.mahabharata, "mahabharata"),
    curator: pickAcquisitions(stories).map((story, i) => ({
      story,
      position: curatorDef.point(CURATOR.acquisitionTs[i], 2.0),
      rotationY: curatorDef.rotationY,
      width: CURATOR.acquisitionW,
      height: CURATOR.acquisitionW * ASPECT,
      badge: "NEW",
    })),
  };
  const slugsByWall = Object.fromEntries(
    (Object.keys(walls) as WallId[]).map((w) => [
      w,
      walls[w].map((p) => p.story.slug).join(","),
    ]),
  ) as Record<WallId, string>;
  return { walls, slugsByWall };
}
