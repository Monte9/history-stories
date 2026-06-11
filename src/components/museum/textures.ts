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
  } = {},
): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSpec = `${weight} ${fontPx}px ${font}`;
  ctx.font = fontSpec;
  const spaced = text.split("").join(" "); // hair-space approximation of tracking
  const metrics = ctx.measureText(spaced);
  const pad = fontPx * 0.5;
  canvas.width = Math.ceil(metrics.width + fontPx * letterSpacing * text.length + pad * 2);
  canvas.height = Math.ceil(fontPx * 1.6);
  ctx.font = fontSpec;
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
