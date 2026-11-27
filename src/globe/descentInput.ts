export type ScrubDepth = (fraction: number, kind: "wheel" | "drag") => void;

export function scrollDescent(event: WheelEvent, height: number, scrub: ScrubDepth): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  const mode = event.deltaMode;
  if (height > 0 && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault();
    const pixels = event.deltaY * (mode === 1 ? 16 : mode === 2 ? height : 1);
    scrub(pixels / (height * 1.65), "wheel");
  }
  return true;
}

export const descentDrag = (pixels: number, height: number) => pixels / Math.max(1, height * 0.65);
