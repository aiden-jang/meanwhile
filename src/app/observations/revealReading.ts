export function revealReading(element: HTMLElement | null, align: "nearest" | "start" = "nearest") {
  const pane = element?.closest<HTMLElement>("#observatory-intro");
  if (!element || !pane) return;
  const paneBox = pane.getBoundingClientRect();
  const heading = element.getBoundingClientRect();
  const inset = 12;
  const delta =
    align === "start"
      ? heading.top - paneBox.top - inset
      : heading.bottom > paneBox.bottom - inset
        ? heading.bottom - paneBox.bottom + inset
        : Math.min(0, heading.top - paneBox.top - inset);
  if (delta) {
    pane.scrollBy({
      top: delta,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
}
