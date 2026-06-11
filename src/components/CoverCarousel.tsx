"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TRADITION_BORDER: Record<string, string> = {
  roman: "var(--color-roman)",
  ramayana: "var(--color-ramayana)",
  mahabharata: "var(--color-mahabharata)",
};

interface Panel {
  src: string;
  kind: "full" | "detail" | "archival";
  alt: string;
}

// Three panels from however many real covers exist: real images first,
// then deterministic CSS treatments of the primary cover (SPEC 5.1).
function buildPanels(covers: string[], title: string): Panel[] {
  const primary = covers[0];
  const kinds: Panel["kind"][] = ["full", "detail", "archival"];
  return kinds.map((kind, i) => ({
    src: covers[i] ?? primary,
    kind: covers[i] ? "full" : kind,
    alt:
      kind === "full" || covers[i]
        ? `${title}, cover ${i + 1}`
        : kind === "detail"
          ? `${title}, detail view`
          : `${title}, archival plate`,
  }));
}

function PanelImage({ panel, tradition }: { panel: Panel; tradition: string }) {
  if (panel.kind === "detail") {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <img
          src={panel.src}
          alt={panel.alt}
          className="h-full w-full object-cover"
          style={{ transform: "scale(1.8)", objectPosition: "25% 40%" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(40, 20, 5, 0.45) 100%)",
          }}
        />
      </div>
    );
  }
  if (panel.kind === "archival") {
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          border: `1px solid ${TRADITION_BORDER[tradition] || "var(--color-border)"}`,
        }}
      >
        <img
          src={panel.src}
          alt={panel.alt}
          className="h-full w-full object-cover"
          style={{
            transform: "scale(1.4)",
            objectPosition: "75% 50%",
            filter: "grayscale(1) sepia(0.35) contrast(1.05)",
          }}
        />
      </div>
    );
  }
  return (
    <img
      src={panel.src}
      alt={panel.alt}
      className="h-full w-full object-cover"
    />
  );
}

export default function CoverCarousel({
  covers,
  title,
  tradition,
}: {
  covers: string[];
  title: string;
  tradition: string;
}) {
  const panels = buildPanels(covers, title);
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // While a smooth scroll we started is in flight, scroll events must not
  // drag the active dot back to the panel being left.
  const scrollTarget = useRef<number | null>(null);

  const goTo = useCallback((i: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    const n = (i + 3) % 3;
    scrollTarget.current = n;
    strip.scrollTo({ left: n * strip.clientWidth, behavior: "smooth" });
    setIndex(n);
  }, []);

  // Desktop: left/right arrows cycle with wrap; up/down left alone for scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo]);

  // Mobile swipe: native scroll-snap; keep the dots in sync with scroll.
  const onScroll = useCallback(() => {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    const i = Math.max(
      0,
      Math.min(2, Math.round(strip.scrollLeft / strip.clientWidth)),
    );
    if (scrollTarget.current !== null) {
      if (i === scrollTarget.current) scrollTarget.current = null;
      return;
    }
    setIndex(i);
  }, []);

  // A touch on the strip takes over from any in-flight programmatic scroll.
  const onPointerDown = useCallback(() => {
    scrollTarget.current = null;
  }, []);

  return (
    <div className="relative">
      <div
        ref={stripRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        data-carousel
        className="flex h-[50vh] min-h-[260px] snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {panels.map((panel, i) => (
          <div
            key={i}
            data-panel={i}
            className="relative h-full w-full shrink-0 snap-center"
          >
            <PanelImage panel={panel} tradition={tradition} />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
      <div
        data-carousel-dots
        className="absolute inset-x-0 bottom-3 flex justify-center gap-2.5"
      >
        {panels.map((_, i) => (
          <button
            key={i}
            aria-label={`Show panel ${i + 1}`}
            aria-current={index === i}
            onClick={() => goTo(i)}
            className={`h-2.5 w-2.5 rounded-full border transition-colors ${
              index === i
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                : "border-[var(--color-text-muted)] bg-transparent hover:bg-[var(--color-text-muted)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
