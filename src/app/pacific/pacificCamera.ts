import { Matrix4, type PerspectiveCamera } from "three";
import type { CameraState } from "../../globe/controlsTypes";
import type { PassageCamera } from "../tonga/passageSurface";
import { ease, mix } from "./aloha";
import { north, south } from "./alohaTransect";
import { alohaStation } from "./pacificMoment";
import { attachPacificRelief } from "./pacificRelief";
import { createPacificLayout, type Project } from "./pacificSectionLayout";

export function attachPacificCast(world: PassageCamera, dialog: HTMLDialogElement, origin: CameraState) {
  const layout = createPacificLayout(dialog);
  const terrain = attachPacificRelief(world);
  const framing = new Matrix4();
  let position = 0;
  let destination = origin;
  let previousPose: CameraState | null = null;
  function frame(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const width = dialog.clientWidth,
      height = dialog.clientHeight;
    const project: Project = (p) => world.controls.project(p.lon, p.lat, 1.004, rect);
    const p = position / 1000;
    const turn = ease(0.135, 0.435, p),
      open = ease(0.435, 0.93, p);
    terrain.show(ease(0.045, 0.205, p));
    if (turn) {
      camera.rotateZ(((-81 * Math.PI) / 180) * turn);
      camera.updateMatrixWorld();
      const a = project(north),
        b = project(south),
        station = project(alohaStation);
      if (a && b && station) {
        const phone = width < 680 && height > width;
        const span = width * (phone ? 0.77 : 0.51) * mix(0.91, 1, open);
        const scale = Math.exp(
          turn * Math.log(Math.min(150, span / Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)))),
        );
        const sy = scale * mix(1, 0.62, turn);
        const x = ((station.x - rect.left) * 2) / rect.width - 1;
        const y = 1 - ((station.y - rect.top) * 2) / rect.height;
        const targetX = ((width * (phone ? 0.365 : 0.57) - rect.left) * 2) / rect.width - 1;
        const targetY = 1 - ((height * ((phone ? 0.373 : 0.46) - 0.085 * open) - rect.top) * 2) / rect.height;
        const tx = (1 - turn - scale) * x + turn * targetX;
        const ty = (1 - turn - sy) * y + turn * targetY;
        framing.set(scale, 0, 0, tx, 0, sy, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
        camera.projectionMatrix.premultiply(framing);
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      }
    }
    layout(project, width, height, position);
  }
  world.optics.frame = frame;
  return {
    seek(next: number) {
      position = next;
      const p = position / 1000;
      world.optics.section = p >= 0.135;
      world.optics.liveWeight = 1 - ease(0.035, 0.17, p);
      const t = ease(0, 0.29, p);
      const longitude = ((((alohaStation.lon - destination.lon) % 360) + 540) % 360) - 180;
      const pose = {
        lon: destination.lon + longitude * t,
        lat: mix(destination.lat, alohaStation.lat, t),
        zoom: destination.zoom * (Math.max(destination.zoom, 3.2) / destination.zoom) ** ease(0, 0.36, p),
      };
      if (
        !previousPose ||
        previousPose.lon !== pose.lon ||
        previousPose.lat !== pose.lat ||
        previousPose.zoom !== pose.zoom
      ) {
        world.controls.setView(pose);
        previousPose = pose;
      }
      world.wake();
    },
    surface() {
      destination = { ...alohaStation, zoom: 1.85 };
    },
    dispose() {
      if (world.optics.frame === frame) {
        delete world.optics.frame;
        delete world.optics.section;
        delete world.optics.liveWeight;
      }
      terrain.dispose();
      world.wake();
    },
  };
}
