import * as THREE from "three";

// Canvas-rendered text textures: no font downloads, no extra deps, works headless.
export function makeTextTexture(
  text: string,
  {
    color = "#2b2b2b",
    fontPx = 96,
    font = "Georgia, 'Times New Roman', serif",
    weight = "600",
    letterSpacing = 0.18,
    background = "",
    border = "",
  } = {},
): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSpec = `${weight} ${fontPx}px ${font}`;
  ctx.font = fontSpec;
  const spaced = text.split("").join(" "); // hair-space approximation of tracking
  const metrics = ctx.measureText(spaced);
  const pad = fontPx * 0.5;
  canvas.width = Math.ceil(metrics.width + fontPx * letterSpacing * text.length + pad * 2);
  canvas.height = Math.ceil(fontPx * 1.6);
  ctx.font = fontSpec;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(2, fontPx * 0.04);
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      canvas.width - ctx.lineWidth,
      canvas.height - ctx.lineWidth,
    );
  }
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  let x = pad;
  for (const ch of text) {
    ctx.fillText(ch, x, canvas.height / 2);
    x += ctx.measureText(ch).width + fontPx * letterSpacing;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

// The entrance placard: museum title, subtitle, and the controls legend,
// rendered as one light plate texture (wall label on white, per SPEC 2.2).
export function makePlacardTexture(): {
  texture: THREE.CanvasTexture;
  aspect: number;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 880;
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width / 2;

  ctx.fillStyle = "#fbfaf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#cfccc4";
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#21201d";
  ctx.font = "600 104px Georgia, 'Times New Roman', serif";
  ctx.fillText("HISTORY STORIES", cx, 170);

  ctx.fillStyle = "#4a4742";
  ctx.font = "italic 52px Georgia, 'Times New Roman', serif";
  ctx.fillText("A Walking Gallery", cx, 290);

  ctx.strokeStyle = "#d8d5cd";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 220, 370);
  ctx.lineTo(cx + 220, 370);
  ctx.stroke();

  ctx.fillStyle = "#4a4742";
  ctx.font = "44px Georgia, 'Times New Roman', serif";
  ctx.fillText("↑ ↓ or scroll  ·  walk      ← →  ·  turn", cx, 460);
  ctx.fillText("drag  ·  look around", cx, 550);
  ctx.fillText("Enter  ·  view a painting", cx, 640);
  ctx.fillText("Esc  ·  step back", cx, 730);

  ctx.fillStyle = "#8a867e";
  ctx.font = "italic 34px Georgia, 'Times New Roman', serif";
  ctx.fillText("Rome · Ramayana · Mahabharata", cx, 815);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

// The Broad's "veil" ceiling: a honeycomb of deep cells, skylight glowing
// through each one. Drawn once as an emissive map (SPEC 2.3).
export function makeVeilTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Cell walls between the glowing openings.
  ctx.fillStyle = "#d2d1cc";
  ctx.fillRect(0, 0, size, size);

  // Pointy-top hex grid, ~12 cells across.
  const cols = 12;
  const r = size / (cols * Math.sqrt(3)) * 1.04; // circumradius
  const w = Math.sqrt(3) * r;
  const h = 1.5 * r;
  const inset = 0.8; // opening size relative to the cell

  const hexPath = (cx: number, cy: number, rad: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const x = cx + rad * Math.cos(a);
      const y = cy + rad * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  for (let row = -1; row * h < size + h; row++) {
    const offset = row % 2 ? w / 2 : 0;
    for (let col = -1; col * w < size + w; col++) {
      const cx = col * w + offset;
      const cy = row * h;
      // Shaded cell throat fakes the veil's depth.
      hexPath(cx, cy, r * 0.94);
      const lip = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
      lip.addColorStop(0, "#bdbcb6");
      lip.addColorStop(1, "#dbdad5");
      ctx.fillStyle = lip;
      ctx.fill();
      // Skylight opening: clearly brighter than the webbing so the cells
      // read as the light source (taste audit finding 8).
      hexPath(cx, cy, r * inset);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * inset);
      glow.addColorStop(0, "#ffffff");
      glow.addColorStop(0.8, "#fefefb");
      glow.addColorStop(1, "#f3f1ea");
      ctx.fillStyle = glow;
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Light polished concrete with faint panel seams (SPEC 2.1).
export function makeFloorTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#c9c9c5";
  ctx.fillRect(0, 0, size, size);

  // Subtle mottling so the floor doesn't read as flat fill.
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = 14 + Math.random() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const tone = Math.random() > 0.5 ? "#cfcfcb" : "#c2c2be";
    g.addColorStop(0, tone);
    g.addColorStop(1, "rgba(201, 201, 197, 0)");
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalAlpha = 1;

  // Soft gloss pooling toward the room center, echoing the veil's glow on
  // polished concrete (taste audit finding 6).
  const gloss = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size * 0.72,
  );
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.26)");
  gloss.addColorStop(0.55, "rgba(255, 255, 255, 0.1)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, size, size);

  // Panel seams: texture spans half the room (12 units), seams every 4 units.
  ctx.strokeStyle = "#b8b8b4";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 3; i++) {
    const p = (i * size) / 3;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  return texture;
}
