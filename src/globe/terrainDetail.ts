import { Texture, Vector4 } from "three";
import type { CameraState } from "./controlsTypes";

const START_ZOOM = 2.25;
const STOP_ZOOM = 1.9;
const FADE_SECONDS = 0.18;
const SETTLE_MS = 150;

const regions = Array.from({ length: 4 }, (_, row) => {
  const latitude = Math.max(-63, Math.min(63, -67.5 + row * 45));
  return Array.from({ length: 8 }, (_, col) => ({
    id: `${col}-${row}`,
    bounds: [(col * 45 + 180 - 36) / 360, (latitude + 90 - 27) / 180, 72 / 360, 54 / 180] as const,
  }));
});

export function terrainRegion(lon: number, lat: number) {
  const col = ((Math.round(lon / 45) % 8) + 8) % 8;
  const row = Math.max(0, Math.min(3, Math.floor((lat + 90) / 45)));
  return regions[row]![col]!;
}

export const terrainDetailShader = `
  uniform sampler2D uTerrainDetail;
  uniform sampler2D uTerrainPrevious;
  uniform vec4 uTerrainBounds;
  uniform vec4 uTerrainPreviousBounds;
  uniform float uTerrainMix;
  vec3 sampleDetail(vec3 base, sampler2D image, vec4 bounds, vec2 atlas, vec2 dx, vec2 dy, float opacity) {
    if (bounds.z == 0. || opacity <= 0.) return base;
    vec2 uv = vec2(fract(atlas.x - bounds.x), atlas.y - bounds.y) / bounds.zw;
    if (uv.x >= 1. || uv.y < 0. || uv.y > 1.) return base;
    float edge = min(uv.x, 1. - uv.x);
    if (bounds.y > .001) edge = min(edge, uv.y);
    if (bounds.y + bounds.w < .999) edge = min(edge, 1. - uv.y);
    vec3 terrain = textureGrad(image, uv, dx / bounds.zw, dy / bounds.zw).rgb;
    return mix(base, terrain, smoothstep(.006, .08, edge) * opacity);
  }
`;

function detailSurface() {
  return { image: { value: null as Texture | null }, bounds: { value: new Vector4() } };
}

export function createTerrainDetail(canvas: HTMLCanvasElement, wake: () => void) {
  const current = detailSurface();
  const previous = detailSurface();
  const mix = { value: 1 };
  let wanted: string | undefined;
  let shown: string | undefined;
  let timer = 0;
  let pending: AbortController | undefined;

  function release(surface: ReturnType<typeof detailSurface>) {
    surface.image.value?.dispose();
    surface.image.value = null;
    surface.bounds.value.set(0, 0, 0, 0);
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
    delete canvas.dataset.terrainDetail;
    mix.value = 1;
  }

  async function load(region: ReturnType<typeof terrainRegion>) {
    const request = new AbortController();
    pending = request;
    let imageUrl: string | undefined;
    try {
      const response = await fetch(`/earth/detail/${region.id}.webp`, { signal: request.signal });
      if (!response.ok) return;
      const blob = await response.blob();
      if (request.signal.aborted) return;
      const image = new Image();
      imageUrl = URL.createObjectURL(blob);
      image.src = imageUrl;
      await image.decode();
      if (request.signal.aborted) return;
      const texture = new Texture(image);
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      release(previous);
      previous.image.value = current.image.value;
      previous.bounds.value.copy(current.bounds.value);
      current.image.value = texture;
      current.bounds.value.set(...region.bounds);
      mix.value = 0;
      shown = region.id;
      canvas.dataset.terrainDetail = shown;
      wake();
    } catch {
      // The overview remains visible if a region is missing or cannot be decoded.
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (pending === request) pending = undefined;
    }
  }

  return {
    uniforms: {
      uTerrainDetail: current.image,
      uTerrainBounds: current.bounds,
      uTerrainPrevious: previous.image,
      uTerrainPreviousBounds: previous.bounds,
      uTerrainMix: mix,
    },
    update(visible: boolean, { lon, lat, zoom }: CameraState) {
      if (!visible || zoom < (wanted ? STOP_ZOOM : START_ZOOM)) {
        if (wanted) clear();
        return;
      }
      const region = terrainRegion(lon, lat);
      if (wanted === region.id) return;
      wanted = region.id;
      cancel();
      if (shown !== wanted) timer = window.setTimeout(() => void load(region), SETTLE_MS);
    },
    step(dt: number, reduced: boolean) {
      if (mix.value >= 1) return false;
      mix.value = reduced ? 1 : Math.min(1, mix.value + dt / FADE_SECONDS);
      if (mix.value === 1) release(previous);
      return true;
    },
    dispose: clear,
  };
}
