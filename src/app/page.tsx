import { getAllStories, Story } from "@/lib/stories";
import Link from "next/link";

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

function StoryCard({ story }: { story: Story }) {
  return (
    <Link href={`/${story.slug}`} className="group block">
      <article className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:border-[var(--color-accent-dim)] hover:shadow-[0_0_40px_var(--color-accent-glow)]">
        {story.cover && (
          <div className="aspect-[16/10] overflow-hidden">
            <img
              src={story.cover}
              alt={story.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${traditionColors[story.tradition] || ""}`}
            >
              {traditionLabels[story.tradition] || story.tradition}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {story.date}
            </span>
          </div>
          <h2 className="mb-2 text-lg font-bold leading-tight text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
            {story.title}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            {story.oneLiner}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-accent-dim)]">
              {story.character}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              · {story.type}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function Home() {
  const stories = getAllStories();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-[var(--color-text)] sm:text-5xl">
            History Stories
          </h1>
          <p className="text-lg text-[var(--color-text-muted)]">
            AI-generated stories from Rome, the Ramayana, and the Mahabharata.
            <br />
            <span className="text-sm">
              New stories delivered daily. Each one with cinematic cover art.
            </span>
          </p>
          {stories.length > 0 && (
            <div className="mt-6 flex justify-center gap-3">
              {["roman", "ramayana", "mahabharata"].map((t) => {
                const count = stories.filter((s) => s.tradition === t).length;
                if (count === 0) return null;
                return (
                  <span
                    key={t}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${traditionColors[t]}`}
                  >
                    {traditionLabels[t]}
                    <span className="opacity-60">{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Stories Grid */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {stories.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-[var(--color-text-muted)]">
              No stories yet. The first one is coming soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-text-muted)]">
        Built by the{" "}
        <a
          href="https://github.com/ashokosnexus"
          className="text-[var(--color-accent-dim)] hover:text-[var(--color-accent)]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ash + Monte
        </a>{" "}
        dyad
      </footer>
    </div>
  );
}
