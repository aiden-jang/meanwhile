type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

const clearance = 6;
const obstructs = (box: Box, x: number, y: number, width: number, height: number) =>
  x < box.right + clearance &&
  x + width > box.left - clearance &&
  y < box.bottom + clearance &&
  y + height > box.top - clearance;

function readingLabelPosition(point: Point, stage: Box, width: number, height: number, blocks: Box[]) {
  if (point.x < stage.left || point.x > stage.right || point.y < stage.top || point.y > stage.bottom)
    return undefined;
  const { x, y } = point;
  const gap = 14;
  const minX = stage.left + clearance;
  const maxX = stage.right - clearance - width;
  const centered = Math.max(minX, Math.min(x - width / 2, maxX));
  const candidates = [
    { x: centered, y: y - height - gap },
    { x: x + gap, y: y - height / 2 },
    { x: x - width - gap, y: y - height / 2 },
    { x: centered, y: y + gap },
  ];
  return candidates.find(
    ({ x, y }) =>
      x >= minX &&
      x <= maxX &&
      y >= stage.top + clearance &&
      y + height <= stage.bottom - clearance &&
      !blocks.some((box) => obstructs(box, x, y, width, height)),
  );
}

type Cue = { key: string; point: Point; timer: number; played?: string; animations?: Animation[] };
const cues = new WeakMap<HTMLElement, Cue>();
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function cancelCue(layer: HTMLElement) {
  const cue = cues.get(layer);
  if (!cue) return;
  window.clearTimeout(cue.timer);
  cue.animations?.forEach((animation) => animation.cancel());
  cues.delete(layer);
}

function cueReading(
  layer: HTMLElement,
  halo: HTMLElement,
  target: HTMLElement | null,
  point: Point,
  map: number,
) {
  if (reducedMotion() || !target || (map > 0 && map < 1)) {
    cancelCue(layer);
    return;
  }
  const key = `${layer.dataset["readingLabel"]}:${map}`;
  const previous = cues.get(layer);
  if (
    previous?.key === key &&
    (previous.played === key || Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < 1)
  )
    return;
  cancelCue(layer);
  const cue: Cue = { key, point, timer: 0 };
  cue.timer = window.setTimeout(() => {
    if (!layer.isConnected || !target.isConnected || reducedMotion() || document.hidden) return;
    cue.played = key;
    const color = getComputedStyle(layer).color;
    const haloAnimation = halo.animate(
      [
        { opacity: 0.75, scale: 0.8 },
        { opacity: 0, scale: 2.1 },
      ],
      { duration: 580, easing: "ease-out" },
    );
    const readingAnimation = target.animate(
      [{ boxShadow: `inset 2px 0 ${color}` }, { boxShadow: "inset 2px 0 transparent" }],
      { duration: 580, easing: "ease-out" },
    );
    cue.animations = [haloAnimation, readingAnimation];
  }, 120);
  cues.set(layer, cue);
}

export function positionReadingLabel(layer: HTMLElement, point: Point | null, map: number) {
  const text = layer.lastElementChild as HTMLElement;
  const halo = layer.firstElementChild as HTMLElement;
  const scope = layer.closest(".replay-region");
  const stage = layer.getBoundingClientRect();
  const blocks = Array.from(
    scope
      ?.closest(".zones")
      ?.querySelectorAll(
        ".stage-ident, .stage-readout, .story-projection, .story-dock, .camera-recenter, .tonga-world-title, .tonga-signal, .storm-track-handle > span, .storm-world-legend, .world-evidence, [data-world-inset], [data-scale], [data-orbit-readout][data-visible=true]",
      ) ?? [],
  ).flatMap((node) => {
    const bounds = node.getBoundingClientRect();
    if (
      !bounds.width ||
      !bounds.height ||
      !obstructs(stage, bounds.left, bounds.top, bounds.width, bounds.height)
    )
      return [];
    const style = getComputedStyle(node);
    return style.visibility === "visible" && Number(style.opacity) > 0 ? [bounds] : [];
  });
  const docked = layer.hasAttribute("data-short-dock") && stage.width <= 360 && stage.height <= 188;
  const position = docked
    ? { x: stage.right - text.offsetWidth - 8, y: stage.bottom - text.offsetHeight - 12 }
    : point && readingLabelPosition(point, stage, text.offsetWidth, text.offsetHeight, blocks);
  text.style.visibility = position ? "visible" : "hidden";
  if (position) text.style.transform = `translate(${position.x - stage.left}px, ${position.y - stage.top}px)`;
  if (!point || obstructsPoint(blocks, point, stage)) {
    cancelCue(layer);
    return;
  }
  halo.style.left = `${point.x - stage.left}px`;
  halo.style.top = `${point.y - stage.top}px`;
  cueReading(layer, halo, scope?.querySelector<HTMLElement>("[data-reading-cue]") ?? null, point, map);
}

function obstructsPoint(blocks: Box[], point: Point, stage: Box) {
  return (
    point.x < stage.left + 12 ||
    point.x > stage.right - 12 ||
    point.y < stage.top + 12 ||
    point.y > stage.bottom - 12 ||
    blocks.some((box) => obstructs(box, point.x - 8, point.y - 8, 16, 16))
  );
}
