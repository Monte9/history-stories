"use client";

// Four body variants (Monte, 2026-06-12): each browser is assigned one at
// random on first visit, B cycles through them, and the choice travels in
// presence state so friends see the body you picked.

export interface AvatarVariant {
  name: string;
  skin: string;
  shirt: string;
  trousers: string;
  shoes: string;
  hair: string | null; // null = no hair mesh
  height: number; // scale on the whole body
  shoulder: number; // scale on shoulder width
}

export const AVATAR_VARIANTS: AvatarVariant[] = [
  {
    name: "charcoal",
    skin: "#c9a585",
    shirt: "#3a4250",
    trousers: "#2a2723",
    shoes: "#1a1816",
    hair: "#2e2620",
    height: 1.0,
    shoulder: 1.0,
  },
  {
    name: "olive",
    skin: "#8a5a3b",
    shirt: "#5c6648",
    trousers: "#3b3a35",
    shoes: "#23201c",
    hair: "#171310",
    height: 1.05,
    shoulder: 1.08,
  },
  {
    name: "maroon",
    skin: "#e4c2a2",
    shirt: "#6e3b3b",
    trousers: "#2f3340",
    shoes: "#1a1816",
    hair: "#5a4630",
    height: 0.96,
    shoulder: 0.94,
  },
  {
    name: "mustard",
    skin: "#b08163",
    shirt: "#a8842e",
    trousers: "#4a4540",
    shoes: "#2b2017",
    hair: null, // shaved
    height: 1.02,
    shoulder: 1.04,
  },
];

export function clampVariant(v: unknown): number {
  const n = typeof v === "number" ? Math.floor(v) : 0;
  return n >= 0 && n < AVATAR_VARIANTS.length ? n : 0;
}
