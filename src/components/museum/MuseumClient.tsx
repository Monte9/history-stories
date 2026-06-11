"use client";

import dynamic from "next/dynamic";
import type { MuseumStory } from "./layout";

const MuseumRoom = dynamic(() => import("./MuseumRoom"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm tracking-[0.25em] text-[var(--color-text-muted)] uppercase">
        Entering the museum…
      </p>
    </div>
  ),
});

export default function MuseumClient({ stories }: { stories: MuseumStory[] }) {
  return <MuseumRoom stories={stories} />;
}
