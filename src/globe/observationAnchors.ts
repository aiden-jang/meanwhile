import { separatePacificLabels } from "./pacificLabels";
import { EARTH_RADIUS_KM } from "../geo/sphere";
import type { Controls } from "./controls";
import { positionGlacierControls } from "./glacierControls";
import { positionEvidenceConnector } from "./evidenceConnector";
import { positionJourneyPreview } from "./journeyPreview";
import { positionReadingLabel } from "./readingLabels";
import { positionObservationTrack } from "./observationTrack";
import { positionStormTrack } from "./stormTrackProjection";

export function positionObservationAnchors(canvas: HTMLCanvasElement, controls: Controls, story = false) {
  const root = canvas.closest(".zones");
  positionJourneyPreview(root, canvas, controls);
  if (story && root) {
    positionObservationTrack(root, canvas, controls);
    positionGlacierControls(root, canvas, controls);
    positionStormTrack(root, canvas, controls);
  }
  const anchors = root?.querySelectorAll<HTMLElement>("[data-observation-anchor]");
  if (!anchors?.length) return;
  const readingLabel = root?.querySelector<HTMLElement>("[data-reading-label]");
  const occupied: { x: number; y: number; fiji: boolean }[] = [];
  let fijiPoint: { x: number; y: number } | undefined;
  let places = 0;
  let locators = 0;
  const insets = story
    ? Array.from(
        root!.querySelectorAll(
          "[data-world-inset], :is(.iceberg-journey, .fault-journey, .megaflash-journey) :is(.story-projection, .stage-ident)",
        ),
        (element) => element.getBoundingClientRect(),
      ).filter(({ width, height }) => width > 0 && height > 0)
    : [];
  const zoom = controls.state().zoom;
  const parents = new Map<Element, DOMRect>();
  const placeWidths = new Map<HTMLElement, number>();
  let evidenceSource: HTMLElement | undefined;
  let selected: HTMLElement | undefined;
  for (const anchor of anchors) {
    if (anchor.dataset["evidenceSource"] === "true") evidenceSource ??= anchor;
    if (anchor.hasAttribute("data-track-handle")) selected = anchor;
    if (anchor.hasAttribute("data-priority-anchor")) selected ??= anchor;
    const parent = anchor.parentElement;
    if (parent && !parents.has(parent)) parents.set(parent, parent.getBoundingClientRect());
    if (!story && anchor.hasAttribute("data-place-label") && zoom >= Number(anchor.dataset["minZoom"])) {
      placeWidths.set(anchor, anchor.offsetWidth);
    }
  }
  const first = evidenceSource ?? selected;
  const ordered = first ? [first, ...Array.from(anchors).filter((anchor) => anchor !== first)] : anchors;
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
      depth === undefined
        ? Number(anchor.dataset["anchorRadius"] ?? 1.01)
        : 1 - Number(depth) / EARTH_RADIUS_KM,
    );
    if (readingLabel && anchor === evidenceSource)
      positionReadingLabel(readingLabel, point, controls.morph());
    const parent = anchor.parentElement ? parents.get(anchor.parentElement) : undefined;
    const x = (point?.x ?? 0) - (parent?.left ?? 0);
    const y = (point?.y ?? 0) - (parent?.top ?? 0);
    const inset = locator ? 82 : Math.max(24, (placeWidths.get(anchor) ?? 0) / 2 + 4);
    const blockInset = anchor.hasAttribute("data-compact-anchor") ? 24 : 55;
    const fiji = anchor.hasAttribute("data-fiji-locator");
    const eruption = anchor.hasAttribute("data-eruption-locator");
    const paired =
      point && parent && fijiPoint && eruption ? separatePacificLabels(point, fijiPoint, parent) : null;
    const flashPulse = anchor.hasAttribute("data-flash-pulse");
    const compactPulse = flashPulse && parent && parent.width <= 360 && parent.height <= 188;
    const spacing = locator ? 152 : place ? 100 : compactPulse ? 32 : 44;
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
      (!(fiji || eruption) ||
        (point.x > 24 &&
          point.x < innerWidth - (fiji ? 110 : 24) &&
          point.y > 24 &&
          point.y < innerHeight - 24)) &&
      !occupied.some((p) => !(paired && p.fiji) && Math.hypot(p.x - x, p.y - y) < spacing);
    if (fiji || eruption) anchor.toggleAttribute("data-positioned", !!visible);
    anchor.style.visibility = visible ? "visible" : "hidden";
    if (visible) {
      if (fiji) fijiPoint = point;
      if (eruption) {
        if (paired) {
          anchor.dataset["paired"] = paired.side;
          anchor.style.setProperty("--leader-length", Math.abs(paired.dx || paired.dy) + "px");
        } else {
          delete anchor.dataset["paired"];
        }
      }
      if (anchor.hasAttribute("data-world-story-marker") || flashPulse)
        anchor.toggleAttribute("data-label-left", point.x + 156 > Math.min(parent.right, innerWidth));
      if (place) places++;
      if (locator) locators++;
      occupied.push({ x, y, fiji });
      // Projection coordinates and parent bounds share the current on-screen transform.
      anchor.style.left = `${((x + (paired?.dx ?? 0)) / parent.width) * 100}%`;
      anchor.style.top = `${((y + (paired?.dy ?? 0)) / parent.height) * 100}%`;
    }
  }
  positionEvidenceConnector(canvas, controls, parents);
}
