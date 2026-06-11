import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const coversDir = path.resolve("public/covers");
const thumbsDir = path.join(coversDir, "thumbs");

const exists = (p) =>
  stat(p).then(
    () => true,
    () => false,
  );

if (!(await exists(coversDir))) {
  console.log("thumbs: no covers dir, skipping");
  process.exit(0);
}
await mkdir(thumbsDir, { recursive: true });

const files = (await readdir(coversDir)).filter((f) => /\.png$/i.test(f));
let built = 0;
for (const f of files) {
  const src = path.join(coversDir, f);
  const out = path.join(thumbsDir, f.replace(/\.png$/i, ".webp"));
  if (await exists(out)) {
    const [s, o] = await Promise.all([stat(src), stat(out)]);
    if (o.mtimeMs >= s.mtimeMs) continue;
  }
  await sharp(src)
    .resize({ width: 1024, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(out);
  built++;
}
console.log(`thumbs: ${files.length} covers, ${built} (re)built`);
