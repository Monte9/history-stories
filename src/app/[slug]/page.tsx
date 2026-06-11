import { getAllSlugs, getStoryBySlug } from "@/lib/stories";
import Link from "next/link";
import { notFound } from "next/navigation";
import CoverCarousel from "@/components/CoverCarousel";
import EscapeReturn from "@/components/EscapeReturn";

const traditionColors: Record<string, string> = {
  roman: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ramayana: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  mahabharata: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const traditionLabels: Record<string, string> = {
  roman: "Rome",
  ramayana: "Ramayana",
  mahabharata: "Mahabharata",
};

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();

  const paragraphs = story.content.split("\n\n").filter(Boolean);

  return (
    <div className="min-h-screen">
      <EscapeReturn />
      {/* Triptych hero */}
      {story.covers.length > 0 && (
        <CoverCarousel
          covers={story.covers}
          title={story.title}
          tradition={story.tradition}
        />
      )}

      {/* Content */}
      <article className="relative mx-auto max-w-2xl px-6 pb-16">
        <div className="pt-10">
          <div className="mb-5">
            <Link
              href="/"
              className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              ← Back to the museum{" "}
              <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs">
                Esc
              </span>
            </Link>
          </div>
          {/* Meta */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${traditionColors[story.tradition] || ""}`}
            >
              {traditionLabels[story.tradition] || story.tradition}
            </span>
            {/* Character */}
            <p className="ml-2 text-sm font-medium text-[var(--color-accent-dim)]">
              {story.character}
            </p>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-3xl font-bold leading-tight sm:text-4xl">
            {story.title}
          </h1>

          {/* Type and Theme */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">
              {story.type} • {story.theme}
            </span>
          </div>

          {/* Body */}
          <div className="space-y-5">
            {paragraphs.map((p, i) => {
              const isReflection = p.startsWith("*") && p.endsWith("*");
              if (isReflection) {
                return (
                  <p
                    key={i}
                    className="border-l-2 border-[var(--color-accent-dim)] pl-4 text-[var(--color-text-muted)] italic"
                  >
                    {p.replace(/^\*+|\*+$/g, "")}
                  </p>
                );
              }
              return (
                <p
                  key={i}
                  className="text-base leading-relaxed text-[var(--color-text)] sm:text-lg"
                >
                  {p}
                </p>
              );
            })}
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-text-muted)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          ← Back to the museum
        </Link>
        <span className="mx-3 opacity-40">·</span>
        <Link href="/gallery" className="hover:text-[var(--color-accent)]">
          Gallery view
        </Link>
      </footer>
    </div>
  );
}
