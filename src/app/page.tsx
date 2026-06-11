import { getAllStories } from "@/lib/stories";
import Link from "next/link";
import MuseumClient from "@/components/museum/MuseumClient";
import type { MuseumStory } from "@/components/museum/layout";

export default function Home() {
  const stories: MuseumStory[] = getAllStories().map(
    ({ slug, title, tradition, coverThumb, date }) => ({
      slug,
      title,
      tradition,
      coverThumb,
      date,
    }),
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--color-bg)]">
      <MuseumClient stories={stories} />
      {/* Shell overlay: server-rendered, works without JS/WebGL */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 sm:p-5">
        <h1 className="rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-semibold tracking-[0.3em] text-[var(--color-text)] uppercase backdrop-blur sm:text-sm">
          History Stories
        </h1>
        <Link
          href="/gallery"
          className="pointer-events-auto rounded-full border border-[var(--color-border)] bg-black/70 px-3.5 py-1.5 text-xs text-[var(--color-text)] backdrop-blur transition-colors hover:border-[var(--color-accent-dim)] hover:text-[var(--color-accent)] sm:text-sm"
        >
          Gallery view
        </Link>
      </header>
    </div>
  );
}
