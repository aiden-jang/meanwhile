import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture, Vector4 } from "three";
import type { CameraState } from "./controlsTypes";
import type { RadarScan } from "../sources/radar";
import { radarMercatorY, rainviewerTile } from "../sources/rainviewer";
import { rainviewerFetch } from "../app/radar/rainviewerFetch";

const Z = 4;
const GRID = 2 ** Z;
const SIDE = 1024;
const START_ZOOM = 2.4;
const STOP_ZOOM = 2.1;

function wrapTile(x: number) {
  return ((x % GRID) + GRID) % GRID;
}

function radarArea({ lon, lat }: CameraState) {
  const x = wrapTile(Math.round(((lon + 180) / 360) * GRID) - 1);
  const y = Math.max(0, Math.min(GRID - 2, Math.round(radarMercatorY(lat) * GRID) - 1));
  return { x, y, key: `${x}/${y}` };
}

async function mosaic(x: number, y: number, path: string, signal: AbortSignal) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIDE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Radar canvas unavailable");
  const coordinates = [0, 1, 2, 3].map((i) => ({
    x: wrapTile(x + (i % 2)),
    y: y + Math.floor(i / 2),
    left: (i % 2) * 512,
    top: Math.floor(i / 2) * 512,
  }));
  async function paint(scanPath?: string) {
    await Promise.all(
      coordinates.map(async ({ x, y, left, top }) => {
        const url = rainviewerTile(Z, x, y, scanPath);
        const image = await createImageBitmap(
          await rainviewerFetch(url, signal, scanPath ? undefined : 3_600_000),
        );
        try {
          signal.throwIfAborted();
          context!.drawImage(image, left, top, 512, 512);
        } finally {
          image.close();
        }
      }),
    );
  }
  await paint();
  const mask = context.getImageData(0, 0, SIDE, SIDE);
  // Keep the overview's coverage hatch at the same geographic scale.
  const scale = GRID / 2;
  for (let row = 0; row < SIDE; row++) {
    for (let col = 0; col < SIDE; col++) {
      const i = (row * SIDE + col) * 4;
      const hatch = (Math.floor(col / scale) + Math.floor(row / scale) + (x + y) * 64) % 12 < 2;
      mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 160;
      mask.data[i + 3] = Math.round(mask.data[i + 3]! * (hatch ? 0.28 : 0.035));
    }
  }
  context.putImageData(mask, 0, 0);
  await paint(path);
  return canvas;
}

export const regionalRadarShader = /* glsl */ `
  uniform sampler2D radarDetail;
  uniform sampler2D radarPreviousDetail;
  uniform vec4 radarDetailBounds;
  uniform vec4 radarPreviousDetailBounds;
  uniform float radarDetailMix;

  vec4 radarBlend(vec4 base, sampler2D image, vec4 bounds, vec2 uv, vec2 dx, vec2 dy, float amount) {
    if (bounds.z == 0. || amount == 0.) return base;
    vec2 local = vec2(fract(uv.x - bounds.x), uv.y - bounds.y) / bounds.zw;
    if (local.x >= 1. || local.y < 0. || local.y > 1.) return base;
    float edge = min(min(local.x, 1. - local.x), min(local.y, 1. - local.y));
    vec4 regional = textureGrad(image, local, dx / bounds.zw, dy / bounds.zw);
    regional.rgb *= regional.a;
    return mix(base, regional, smoothstep(.005, .09, edge) * amount);
  }
`;

// Both projections sample the same regional tiles at the displayed scan's timestamp.
export const regionalRadarMapFragment = /* glsl */ `
#ifdef USE_MAP
  vec4 overall = texture2D(map, vMapUv);
  vec4 base = vec4(overall.rgb * overall.a, overall.a);
  vec2 dx = dFdx(vMapUv);
  vec2 dy = dFdy(vMapUv);
  vec4 previous = radarBlend(base, radarPreviousDetail, radarPreviousDetailBounds, vMapUv, dx, dy, 1.);
  vec4 detail = radarBlend(base, radarDetail, radarDetailBounds, vMapUv, dx, dy, 1.);
  vec4 radar = radarDetailMix >= 1. ? detail : mix(previous, detail, radarDetailMix);
  diffuseColor *= vec4(radar.rgb / max(radar.a, .0001), radar.a);
#endif
`;

function tileTexture() {
  return { image: { value: null as Texture | null }, bounds: { value: new Vector4() } };
}

export function createRadarDetail(canvas: HTMLCanvasElement, wake: () => void) {
  const current = tileTexture();
  const previous = tileTexture();
  const mix = { value: 1 };
  let scan: RadarScan | undefined;
  let wanted: string | undefined;
  let shown: string | undefined;
  let timer = 0;
  let pending: AbortController | undefined;

  function release(tile: ReturnType<typeof tileTexture>) {
    tile.image.value?.dispose();
    tile.image.value = null;
    tile.bounds.value.set(0, 0, 0, 0);
  }

  function cancel() {
    window.clearTimeout(timer);
    pending?.abort();
    pending = undefined;
  }

  function clear() {
    cancel();
    wanted = shown = undefined;
    release(current);
    release(previous);
    delete canvas.dataset.radarDetailAt;
    mix.value = 1;
  }

  async function load(area: ReturnType<typeof radarArea>, at: number, path: string) {
    const request = new AbortController();
    pending = request;
    try {
      const image = await mosaic(area.x, area.y, path, request.signal);
      request.signal.throwIfAborted();
      const texture = new CanvasTexture(image);
      texture.flipY = false;
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      release(previous);
      previous.image.value = current.image.value;
      previous.bounds.value.copy(current.bounds.value);
      current.image.value = texture;
      current.bounds.value.set(area.x / GRID, area.y / GRID, 2 / GRID, 2 / GRID);
      mix.value = 0;
      shown = area.key;
      canvas.dataset.radarDetailAt = String(at);
      wake();
    } catch {
      // The matching overview remains visible if the region cannot load.
    } finally {
      request.abort();
      if (pending === request) pending = undefined;
    }
  }

  return {
    uniforms: {
      radarDetail: current.image,
      radarDetailBounds: current.bounds,
      radarPreviousDetail: previous.image,
      radarPreviousDetailBounds: previous.bounds,
      radarDetailMix: mix,
    },
    setScan(frame: RadarScan | undefined) {
      if (scan?.at === frame?.at && scan?.path === frame?.path) return;
      scan = frame;
      clear();
    },
    update(camera: CameraState, moving: boolean) {
      if (!scan?.path || camera.zoom < (wanted ? STOP_ZOOM : START_ZOOM)) {
        if (wanted) clear();
        return;
      }
      if (moving || document.hidden) return;
      const area = radarArea(camera);
      if (wanted === area.key) return;
      wanted = area.key;
      cancel();
      const { at, path } = scan;
      if (shown !== wanted) timer = window.setTimeout(() => void load(area, at, path), 170);
    },
    step(dt: number, reduced: boolean) {
      if (mix.value >= 1) return false;
      mix.value = reduced ? 1 : Math.min(1, mix.value + dt / 0.19);
      if (mix.value === 1) release(previous);
      return true;
    },
  };
}
