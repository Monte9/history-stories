"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Escape steps back into the museum room; the room restores the saved camera.
export default function EscapeReturn() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
