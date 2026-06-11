import * as THREE from "three";

// Canvas-rendered text textures: no font downloads, no extra deps, works headless.
export function makeTextTexture(
  text: string,
  {
    color = "#f0f0f5",
    fontPx = 96,
    font = "Georgia, 'Times New Roman', serif",
    weight = "600",
    letterSpacing = 0.18,
    background = "",
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
// rendered as one plate texture.
export function makePlacardTexture(): {
  texture: THREE.CanvasTexture;
  aspect: number;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 880;
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width / 2;

  ctx.fillStyle = "#16121c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#5b4a78";
  ctx.lineWidth = 6;
  ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#efe7d4";
  ctx.font = "600 104px Georgia, 'Times New Roman', serif";
  ctx.fillText("HISTORY STORIES", cx, 170);

  ctx.fillStyle = "#c084fc";
  ctx.font = "italic 52px Georgia, 'Times New Roman', serif";
  ctx.fillText("A Night Gallery", cx, 290);

  ctx.strokeStyle = "#3a3347";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 220, 370);
  ctx.lineTo(cx + 220, 370);
  ctx.stroke();

  ctx.fillStyle = "#c2c2d4";
  ctx.font = "44px Georgia, 'Times New Roman', serif";
  ctx.fillText("↑ ↓  walk      ← →  turn", cx, 480);
  ctx.fillText("Enter  —  view a painting", cx, 590);
  ctx.fillText("Esc  —  step back", cx, 700);

  ctx.fillStyle = "#7a7a92";
  ctx.font = "italic 34px Georgia, 'Times New Roman', serif";
  ctx.fillText("Rome · Ramayana · Mahabharata", cx, 800);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}
