// Resolve against Vite's base so the assets work both locally ("/") and on
// GitHub Pages ("/voxmute-archive/"). BASE_URL always ends with a slash.
export const VOXMUTE_URL = `${import.meta.env.BASE_URL}voxmute.webp`;

/** Bust crop used by the end card. */
export const VOXMUTE_CARD_URL = `${import.meta.env.BASE_URL}voxmute-card.webp`;

/**
 * Optional diagnostics for the Canvas renderer.
 *
 * drawSubject() in main.ts already no-ops when the portrait has not decoded, so
 * a missing asset shows up only as an empty frame - hard to spot in a recording.
 * Call this with the subject image to get an explicit console line either way.
 */
export function reportVoxmuteStatus(img: HTMLImageElement): void {
  const describe = () => {
    if (img.naturalWidth > 0) {
      console.log(
        `[voxmute] portrait ready: ${img.naturalWidth}x${img.naturalHeight} from ${VOXMUTE_URL}`,
      );
    } else {
      console.error(
        `[voxmute] portrait missing at ${VOXMUTE_URL} - expected public/voxmute.webp`,
      );
    }
  };
  if (img.complete) describe();
  else {
    img.addEventListener("load", describe, { once: true });
    img.addEventListener(
      "error",
      () =>
        console.error(
          `[voxmute] could not load ${VOXMUTE_URL} - expected public/voxmute.webp`,
        ),
      { once: true },
    );
  }
}
