import { getAllSlugs, getStoryBySlug } from "@/lib/stories";
import Link from "next/link";
import { notFound } from "next/navigation";

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
      {/* Hero */}
      {story.cover && (
        <div className="relative h-[50vh] min-h-[300px] overflow-hidden">
          <img
            src={story.cover}
            alt={story.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <article className="relative mx-auto max-w-2xl px-6 pb-16">
        <div className={story.cover ? "-mt-24" : "pt-12"}>
          {/* Back link */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            ← All stories
          </Link>

          {/* Meta */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${traditionColors[story.tradition] || ""}`}
            >
              {traditionLabels[story.tradition] || story.tradition}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {story.date}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              · {story.type}
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-3xl font-bold leading-tight sm:text-4xl">
            {story.title}
          </h1>

          {/* Character */}
          <p className="mb-8 text-sm font-medium text-[var(--color-accent-dim)]">
            {story.character}
          </p>

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
          ← Back to all stories
        </Link>
      </footer>
    </div>
  );
}
