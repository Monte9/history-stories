// Shared between the DOM overlay (prompt, navigation) and the 3D scene
// (tap-to-focus on paintings) without threading React context through the
// r3f reconciler.
export const focusStore = {
  // Tap focus override: a tapped painting stays focused regardless of
  // proximity until movement or another tap clears it.
  tapSlug: "",
  // Registered by the room shell (owns the router and camera save).
  openStory: null as ((slug: string) => void) | null,
};
