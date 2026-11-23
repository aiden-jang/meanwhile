import { EARTH_RADIUS_KM } from "../geo/sphere";
import type { Controls } from "./controls";
import { positionEvidenceConnector } from "./evidenceConnector";
import { positionJourneyPreview } from "./journeyPreview";

export function positionObservationAnchors(canvas: HTMLCanvasElement, controls: Controls, story = false) {
  const root = canvas.closest(".zones");
  positionJourneyPreview(root, canvas, controls);
  const anchors = root?.querySelectorAll<HTMLElement>("[data-observation-anchor]");
  if (!anchors?.length) return;
  const occupied: { x: number; y: number }[] = [];
  let places = 0;
  let locators = 0;
  const insets = story
    ? Array.from(
        root!.querySelectorAll(
          "[data-world-inset], .iceberg-journey .stage-ident, .iceberg-journey .stage-readout",
        ),
        (element) => element.getBoundingClientRect(),
      ).filter(({ width, height }) => width > 0 && height > 0)
    : [];
  const zoom = controls.state().zoom;
  const parents = new Map<Element, DOMRect>();
  const placeWidths = new Map<HTMLElement, number>();
  let evidenceSource: HTMLElement | undefined;
  for (const anchor of anchors) {
    if (anchor.dataset["evidenceSource"] === "true") evidenceSource ??= anchor;
    const parent = anchor.parentElement;
    if (parent && !parents.has(parent)) parents.set(parent, parent.getBoundingClientRect());
    if (!story && anchor.hasAttribute("data-place-label") && zoom >= Number(anchor.dataset["minZoom"])) {
      placeWidths.set(anchor, anchor.offsetWidth);
    }
  }
  const ordered = evidenceSource
    ? [evidenceSource, ...Array.from(anchors).filter((anchor) => anchor !== evidenceSource)]
    : anchors;
  for (const anchor of ordered) {
    const place = anchor.hasAttribute("data-place-label");
    const locator = anchor.hasAttribute("data-story-locator");
    if (
      (place && (story || places >= 5)) ||
      (locator && locators >= 3) ||
      zoom < Number(anchor.dataset["minZoom"] ?? 0)
    ) {
      anchor.style.visibility = "hidden";
      continue;
    }
    const depth = anchor.dataset["depthKm"];
    const point = controls.project(
      Number(anchor.dataset["lon"]),
      Number(anchor.dataset["lat"]),
      depth === undefined ? 1.01 : 1 - Number(depth) / EARTH_RADIUS_KM,
    );
    const parent = anchor.parentElement ? parents.get(anchor.parentElement) : undefined;
    const x = (point?.x ?? 0) - (parent?.left ?? 0);
    const y = (point?.y ?? 0) - (parent?.top ?? 0);
    const inset = locator ? 82 : Math.max(24, (placeWidths.get(anchor) ?? 0) / 2 + 4);
    const blockInset = anchor.hasAttribute("data-compact-anchor") ? 24 : 55;
    const visible =
      point &&
      parent &&
      !insets.some(
        (rect) =>
          point.x > rect.left - 22 &&
          point.x < rect.right + 22 &&
          point.y > rect.top - 22 &&
          point.y < rect.bottom + 22,
      ) &&
      x > inset &&
      x < parent.width - inset &&
      y > blockInset &&
      y < parent.height - blockInset &&
      !occupied.some((p) => Math.hypot(p.x - x, p.y - y) < (locator ? 152 : place ? 100 : 44));
    anchor.style.visibility = visible ? "visible" : "hidden";
    if (visible) {
      if (place) places++;
      if (locator) locators++;
      occupied.push({ x, y });
      anchor.style.left = `${x}px`;
      anchor.style.top = `${y}px`;
    }
  }
  positionEvidenceConnector(canvas, controls, parents);
}
