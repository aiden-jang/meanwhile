import { Matrix4, Vector3, type PerspectiveCamera } from "three";
import { positionFijiSection } from "../app/fijiSectionLayout";
import { FIJI_NORTH_EDGE, FIJI_TRANSECT } from "../geo/fijiSection";
import { depthRecords } from "../data/depthRecords";
import { MAP_HALF_WIDTH } from "./morph";
import { DEG, toVec3 } from "../geo/sphere";
import { FIJI_CENTRE } from "./fijiApproach";
import type { Controls } from "./controlsTypes";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const { west, east } = FIJI_TRANSECT;
const viti = { lon: 177.98, lat: -17.85 };

export function createFijiSectionCamera(canvas: HTMLCanvasElement, controls: Controls) {
  const pivot = new Vector3(...toVec3(FIJI_CENTRE.lon, FIJI_CENTRE.lat, 1));
  const mapPivot = new Vector3();
  const right = new Vector3();
  const frame = new Matrix4();
  let applied = false;
  let arrival = 0;
  let leaving = 0;
  let tiltFrom = 0,
    tiltTo = 0,
    projectionAt = 0;
  const tiltWeight = (now: number) =>
    tiltFrom + (tiltTo - tiltFrom) * smooth(clamp((now - projectionAt) / 400));
  let previous: Element | null = null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  return {
    reset(camera: PerspectiveCamera) {
      if (!applied) return;
      controls.apply();
      camera.updateProjectionMatrix();
      applied = false;
    },
    moving() {
      return (
        previous !== null &&
        (tiltTo !== 1 - controls.morph() ||
          performance.now() < Math.max(arrival + 800, leaving ? leaving + 450 : 0, projectionAt + 400))
      );
    },
    apply(camera: PerspectiveCamera, registration?: { value: number }) {
      if (!registration) {
        previous = null;
        return;
      }
      const section = canvas.closest(".zones")?.querySelector<SVGSVGElement>("svg.fiji-section");
      if (!section) {
        registration.value = 0;
        previous = null;
        return;
      }
      const now = performance.now();
      const depth = Number(section.dataset.depth ?? 0);
      const tiltGoal = 1 - controls.morph();
      if (previous !== section) {
        previous = section;
        arrival = depth > 0 || reduced.matches ? now - 1000 : now;
        leaving = 0;
        tiltFrom = tiltTo = tiltGoal;
        projectionAt = now - 400;
      } else if (tiltGoal !== tiltTo) {
        tiltFrom = reduced.matches ? tiltGoal : tiltWeight(now);
        tiltTo = tiltGoal;
        projectionAt = now;
      }
      if (section.closest("[data-returning]")) leaving ||= now;
      else leaving = 0;

      const time = reduced.matches ? 1 : smooth(clamp((now - arrival) / 800));
      const exit = leaving ? 1 - smooth(clamp((now - leaving) / 450)) : 1;
      const cameraState = controls.state();
      const longitude = ((cameraState.lon - FIJI_CENTRE.lon + 540) % 360) - 180;
      const error = Math.hypot(longitude, cameraState.lat - FIJI_CENTRE.lat);
      const register = time * exit * smooth(clamp(1 - error / 42));
      registration.value = register;
      const progress = clamp(depth / depthRecords[1].depthKm);
      const opening = progress * (1.55 - 0.55 * progress);
      const bounds = canvas.getBoundingClientRect();
      const project = (p: { lon: number; lat: number }) => controls.project(p.lon, p.lat, 1, bounds);

      if (register > 0 && tiltWeight(now) > 0) {
        // Orbit the surface point itself so the islands stay in place as their section opens.
        const tilt = 43 * DEG * opening * register * tiltWeight(now);
        const wrappedLon = cameraState.lon - Math.floor((cameraState.lon + 180) / 360) * 360;
        const pivotLon = FIJI_CENTRE.lon + 360 * Math.round((wrappedLon - FIJI_CENTRE.lon) / 360);
        const focus =
          controls.morph() === 0
            ? pivot
            : mapPivot.set((pivotLon / 180) * MAP_HALF_WIDTH, FIJI_CENTRE.lat / 90, 0);
        right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        camera.position.sub(focus).applyAxisAngle(right, tilt).add(focus);
        camera.rotateX(tilt);
        camera.updateMatrixWorld();
        applied = true;
      }
      const a = project(west),
        b = project(east);
      if (!a || !b || b.x <= a.x + 1) {
        positionFijiSection(section, null, null, null, null, null);
        return;
      }
      const phone = bounds.width < 700 && bounds.height > bounds.width;
      const width = bounds.width,
        height = bounds.height;
      const shortWide = height < 460 && width > height;
      const span = width * (phone ? 0.53 + 0.27 * opening : 0.29 + (shortWide ? 0.19 : 0.24) * opening);
      const scale = Math.exp(register * Math.log(Math.min(80, span / (b.x - a.x))));
      const x = (a.x + b.x - 2 * bounds.left) / width - 1;
      const y = 1 - (a.y + b.y - 2 * bounds.top) / height;
      const goalX = phone ? -0.035 : 0.25;
      const lift = phone ? 0.105 : shortWide ? 0.135 : 0.205;
      const goalY = 1 - 2 * ((phone ? 0.42 : 0.47) - lift * opening);
      const tx = (1 - register - scale) * x + register * goalX;
      const ty = (1 - register - scale) * y + register * goalY;
      // Off-axis framing affects the world and every geographic anchor through the same projection.
      frame.set(scale, 0, 0, tx, 0, scale, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
      camera.projectionMatrix.premultiply(frame);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      applied = true;
      positionFijiSection(
        section,
        project(west),
        project(east),
        project(viti),
        project(FIJI_NORTH_EDGE.west),
        project(FIJI_NORTH_EDGE.east),
      );
    },
  };
}
