import fs from "fs";
import path from "path";
import matter from "gray-matter";

const storiesDir = path.join(process.cwd(), "stories");

export interface Story {
  slug: string;
  title: string;
  character: string;
  tradition: "roman" | "ramayana" | "mahabharata";
  type: string;
  theme: string;
  date: string;
  cover: string;
  covers: string[];
  coverThumb: string;
  oneLiner: string;
  content: string;
}

function coverThumbFor(cover: string): string {
  if (!cover) return "";
  const base = path.posix.basename(cover).replace(/\.png$/i, ".webp");
  return `/covers/thumbs/${base}`;
}

function parseStory(slug: string, raw: string): Story {
  const { data, content } = matter(raw);
  const cover = data.cover || "";
  const covers =
    Array.isArray(data.covers) && data.covers.length > 0
      ? data.covers
      : cover
        ? [cover]
        : [];
  return {
    slug,
    title: data.title || slug,
    character: data.character || "",
    tradition: data.tradition || "roman",
    type: data.type || "",
    theme: data.theme || "",
    date: data.date || "",
    cover,
    covers,
    coverThumb: coverThumbFor(cover),
    oneLiner: data.oneLiner || "",
    content: content.trim(),
  };
}

export function getAllStories(): Story[] {
  if (!fs.existsSync(storiesDir)) return [];

  const files = fs
    .readdirSync(storiesDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(storiesDir, file), "utf-8");
    return parseStory(slug, raw);
  });
}

export function getStoryBySlug(slug: string): Story | null {
  const filePath = path.join(storiesDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parseStory(slug, fs.readFileSync(filePath, "utf-8"));
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(storiesDir)) return [];
  return fs
    .readdirSync(storiesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
