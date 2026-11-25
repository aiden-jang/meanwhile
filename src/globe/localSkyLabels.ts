import { Matrix4, Vector3, type PerspectiveCamera } from "three";
import { moonNight } from "../geo/nightTrail";
import { pathLine, projectedMoonPaths, type SkyPath } from "./projectedSkyPath";
import { DEG } from "../geo/sphere";
import type { SkyLook, TonightView } from "../geo/tonight";

export function createLocalSkyLabels(canvas: HTMLCanvasElement, up: Vector3) {
  const east = new Vector3();
  const north = new Vector3();
  const forward = new Vector3();
  const ray = new Vector3();
  const point = new Vector3();
  let labels: HTMLElement | null = null;
  const transform = new Matrix4();
  const lastTransform = new Matrix4();
  let lastArc: Element | null = null;
  let lastTrail: readonly SkyLook[] | undefined;
  let moonPath: SkyPath = [];
  let lastMoonAt: number | undefined;
  let layout = { x: 0, y: 0, width: 100, height: 100 };

  function project(camera: PerspectiveCamera, look: SkyLook) {
    const bearing = look.azimuth * DEG;
    const altitude = look.altitude * DEG;
    const level = Math.cos(altitude);
    ray
      .copy(north)
      .multiplyScalar(level * Math.cos(bearing))
      .addScaledVector(east, level * Math.sin(bearing))
      .addScaledVector(up, Math.sin(altitude));
    if (ray.dot(forward) < 0.1) return null;
    point.copy(camera.position).addScaledVector(ray, 70).project(camera);
    return {
      x: layout.x + ((point.x + 1) / 2) * layout.width,
      y: layout.y + ((1 - point.y) / 2) * layout.height,
    };
  }

  return (camera: PerspectiveCamera, view: TonightView | null) => {
    if (!labels?.isConnected) {
      if (!view) return;
      labels = canvas.closest(".zones")?.querySelector<HTMLElement>("[data-sky-labels]") ?? null;
    }
    if (!labels) return;
    let resized = false;
    if (view) {
      // The canvas reaches under the header and panel, while the sky controls sit in the open stage.
      const frame = canvas.getBoundingClientRect();
      const stage = labels.getBoundingClientRect();
      const next = {
        x: (100 * (frame.left - stage.left)) / Math.max(1, stage.width),
        y: (100 * (frame.top - stage.top)) / Math.max(1, stage.height),
        width: (100 * frame.width) / Math.max(1, stage.width),
        height: (100 * frame.height) / Math.max(1, stage.height),
      };
      resized =
        next.x !== layout.x ||
        next.y !== layout.y ||
        next.width !== layout.width ||
        next.height !== layout.height;
      layout = next;
      const lon = view.city.lon * DEG;
      east.set(Math.cos(lon), 0, -Math.sin(lon));
      north.crossVectors(up, east);
      camera.getWorldDirection(forward);
    }
    const arc = labels.parentElement?.querySelector("[data-sky-arc]") ?? null;
    if (arc) {
      const moon =
        arc.hasAttribute("data-moon-arc") && view?.nightStart !== undefined
          ? moonNight(view.city, view.nightStart)
          : null;
      const trail = moon?.points ?? view?.nightTrail?.points ?? view?.radiantTrail;
      transform.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const changed = resized || arc !== lastArc || trail !== lastTrail || !lastTransform.equals(transform);
      if (changed) {
        if (moon) {
          moonPath = moon.points.map((look) => {
            const point = look.altitude >= 0 ? project(camera, look) : null;
            return point && { ...point, at: look.at };
          });
          projectedMoonPaths.set(arc, moonPath);
          arc.setAttribute("d", pathLine(moonPath));
        } else {
          let path = "";
          let joined = false;
          for (const look of trail ?? []) {
            const at = look.altitude >= 0 ? project(camera, look) : null;
            if (at) path += `${joined ? "L" : "M"}${at.x.toFixed(2)} ${at.y.toFixed(2)} `;
            joined = at !== null;
          }
          arc.setAttribute("d", path);
        }
        lastTransform.copy(transform);
        lastTrail = trail;
      }
      if (moon && view && (changed || lastMoonAt !== view.at)) {
        const end = moon.points.findIndex(({ at }) => at > view.at);
        const body = view.bodies[0]!;
        const current = body.altitude > 0 ? project(camera, body) : null;
        arc.nextElementSibling?.setAttribute(
          "d",
          pathLine([
            ...moonPath.slice(0, end < 0 ? moonPath.length : end),
            current && { ...current, at: view.at },
          ]),
        );
        lastMoonAt = view.at;
      }
    } else {
      lastTrail = undefined;
    }
    lastArc = arc;
    const placed: { x: number; y: number }[] = [];
    const preferred = (label: HTMLElement) =>
      label.hasAttribute("data-moon-control") ? 2 : Number(label.dataset["body"] === view?.targetName);
    const ordered = Array.from(labels.children) as HTMLElement[];
    ordered.sort((a, b) => preferred(b) - preferred(a));
    for (const label of ordered) {
      const body = view?.bodies.find(({ name }) => name === label.dataset["body"]);
      let visible = false;
      if (body && body.altitude > 0) {
        const at = project(camera, body);
        const { x, y } = at ?? { x: 0, y: 0 };
        visible =
          at !== null &&
          x > 4 &&
          x < 87 &&
          y > 10 &&
          y < 88 &&
          !placed.some(
            (previous) =>
              Math.abs(previous.x - x) < 16 &&
              Math.abs(previous.y - y) <
                (label.tagName === "BUTTON" ? 4400 / Math.max(1, canvas.clientHeight) : 5),
          );
        if (visible) {
          placed.push({ x, y });
          if (label.hasAttribute("data-moon-control")) label.dataset["edge"] = x > 62 ? "right" : "";
          label.style.left = `${x}%`;
          label.style.top = `${y}%`;
        }
      }
      if (!visible && label.hasAttribute("data-moon-control") && document.activeElement === label)
        document.querySelector<HTMLInputElement>(".tonight-scrub")?.focus({ preventScroll: true });
      label.style.visibility = visible ? "visible" : "";
    }
  };
}
