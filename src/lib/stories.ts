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
  oneLiner: string;
  content: string;
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
    const { data, content } = matter(raw);
    return {
      slug,
      title: data.title || slug,
      character: data.character || "",
      tradition: data.tradition || "roman",
      type: data.type || "",
      theme: data.theme || "",
      date: data.date || "",
      cover: data.cover || "",
      oneLiner: data.oneLiner || "",
      content: content.trim(),
    };
  });
}

export function getStoryBySlug(slug: string): Story | null {
  const filePath = path.join(storiesDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title || slug,
    character: data.character || "",
    tradition: data.tradition || "roman",
    type: data.type || "",
    theme: data.theme || "",
    date: data.date || "",
    cover: data.cover || "",
    oneLiner: data.oneLiner || "",
    content: content.trim(),
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(storiesDir)) return [];
  return fs
    .readdirSync(storiesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
