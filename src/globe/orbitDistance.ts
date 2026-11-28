import type { PerspectiveCamera } from "three";
import { RADIUS_ATMOSPHERE } from "../geo/land";
import { DEG } from "../geo/sphere";
import { MAP_HALF_WIDTH } from "./morph";

import { ZOOM_MIN, ZOOM_MAX } from "./framing";

export const ORBIT_FLOOR = RADIUS_ATMOSPHERE + 0.12;

/* The map is the ball unrolled to 4 by 2, so it needs its own fraction. Measure against the
   height-only fit: fitting by the tighter dimension is right for a ball and, on a phone, framed the
   map's width and left a strip across the middle. */
const MAP_FIT = 0.72;

export function createOrbitDistance(camera: PerspectiveCamera, fovDeg: number) {
  let fit = 4;
  let heightFit = 4;
  const mapFit = () => heightFit * MAP_FIT;
  let layers = false;
  function region(zoom: number) {
    const u = layers ? Math.max(0, Math.min(1, (zoom - 1.65) / 1.65)) : 0;
    return u * u * (3 - 2 * u);
  }
  function distance(zoom: number, morph: number) {
    const framed = Math.max(ORBIT_FLOOR, (fit + (mapFit() - fit) * morph) / Math.min(3, zoom));
    return Math.max(0.18, framed / Math.max(1, zoom / 3) ** morph);
  }
  return {
    region,
    setLayers(active: boolean) {
      layers = active;
    },
    fit(distance: number, byHeight: number) {
      fit = distance;
      heightFit = byHeight;
    },
    at: distance,
    magnification(zoom: number, morph: number): number {
      const lens = Math.max(1, zoom / 3);
      const normal = lens ** (1 - morph);
      const weight = region(zoom);
      if (!weight || !morph) return normal;
      const altitude = distance(zoom, morph) - (1 - morph);
      // One radian of latitude occupies one globe unit and 2/π units on the unfolded map.
      const meridian = 1 + (2 / Math.PI - 1) * morph;
      const matched = (lens * altitude) / ((distance(zoom, 0) - 1) * meridian);
      return normal * (matched / normal) ** weight;
    },
    clamp(zoom: number, morph: number): number {
      // The globe has a fixed lower bound. A zoomed-out map can show a full repeated world.
      const wholeWorld = (mapFit() * Math.tan((fovDeg / 2) * DEG) * camera.aspect) / MAP_HALF_WIDTH;
      const floor = ZOOM_MIN + (Math.min(ZOOM_MIN, wholeWorld) - ZOOM_MIN) * morph;
      return Math.max(floor, Math.min(ZOOM_MAX, zoom));
    },
  };
}
