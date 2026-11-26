type Point = { x: number; y: number };

// At world scale the Fiji quake and Tonga eruption can be just a few pixels apart.
// Give both a full touch target and lead the displaced label back to the eruption.
export function separatePacificLabels(eruption: Point, fiji: Point, bounds: DOMRect) {
  if (Math.abs(eruption.y - fiji.y) >= 48 || Math.abs(eruption.x - fiji.x) > 122) return null;
  const left = Math.min(eruption.x - 8, fiji.x - 25);
  if (left - Math.max(0, bounds.left) >= 88) return { side: "left", dx: left - eruption.x, dy: 0 };
  const below = Math.max(eruption.y + 22, fiji.y + 48);
  if (below + 22 <= bounds.bottom) return { side: "below", dx: 0, dy: below - eruption.y };
  const above = Math.min(eruption.y - 22, fiji.y - 48);
  if (above - 22 >= Math.max(0, bounds.top)) return { side: "above", dx: 0, dy: above - eruption.y };
  return null;
}
