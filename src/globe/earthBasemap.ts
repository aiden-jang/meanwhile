import {
  RepeatWrapping,
  TextureLoader,
  type LineBasicMaterial,
  type MeshBasicMaterial,
  type ShaderMaterial,
  type Texture,
} from "three";
import { createFijiRelief, fijiReliefShader } from "./fijiRelief";
import type { GlobePresentation } from "./scenePresentation";
import { solarOffsetMinutes, landingSolarTime } from "./landingSolarClock";

export interface SurfaceView {
  globePresentation: GlobePresentation;
  landing: boolean;
  cutaway: { descent?: true | undefined; sweepKm?: number | undefined } | null;
  inspection: object | null;
}

export function showsSatellite(view?: SurfaceView) {
  if (!view || view.inspection) return false;
  if (view.cutaway) return !!view.cutaway.descent;
  const mode = view.globePresentation;
  return (
    mode === null ||
    mode === "landing" ||
    (mode === "dayline" && view.landing) ||
    (typeof mode === "object" &&
      "kind" in mode &&
      mode.kind === "map-layers" &&
      (view.landing || mode.base !== "dayline"))
  );
}

export function createEarthBasemap(
  canvas: HTMLCanvasElement,
  ocean: MeshBasicMaterial,
  fill: MeshBasicMaterial,
  grid: LineBasicMaterial,
  coast: LineBasicMaterial,
  night: ShaderMaterial,
  wake: () => void,
) {
  const strength = { value: 0 };
  const terrain = { value: null as Texture | null };
  const lights = { value: null as Texture | null };
  const relief = createFijiRelief(wake);
  const compile = ocean.onBeforeCompile;
  const key = ocean.customProgramCacheKey();
  ocean.onBeforeCompile = (shader, renderer) => {
    compile.call(ocean, shader, renderer);
    Object.assign(shader.uniforms, {
      uAtlasOn: strength,
      uAtlas: terrain,
      uCityLights: lights,
      ...relief.uniforms,
    });
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "varying vec2 vAtlas;\nvoid main() {\n vAtlas = aLonLat / vec2(360.0, 180.0) + 0.5;",
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `
      uniform float uAtlasOn;
      uniform sampler2D uAtlas;
      uniform sampler2D uCityLights;
      ${fijiReliefShader}
      varying vec2 vAtlas;
      vec3 atlasToLinear(vec3 x) {
        return mix(x / 12.92, pow((x + .055) / 1.055, vec3(2.4)), step(vec3(.04045), x));
      }
      void main() {
    `,
      )
      .replace(
        "#include <alphamap_fragment>",
        `
      if (uAtlasOn > 0.5) {
        vec3 source = texture2D(uAtlas, vAtlas).rgb;
        float emission = pow(smoothstep(.065, .85, texture2D(uCityLights, vAtlas).r), 1.28);
        vec3 normal = normalize(vSurfaceDirection);
        float daylight = smoothstep(-.12, .41, dot(normal, normalize(uSurfaceSun)));
        float land = smoothstep(-.020, .060, source.r - source.b);
        vec3 surface = pow(source, vec3(.73));
        float luminance = dot(surface, vec3(.29, .55, .16));
        vec3 terrain = mix(vec3(luminance), surface, .73) * vec3(1.09, 1.075, 1.02);
        vec3 sea = mix(vec3(.030, .087, .116), vec3(.12, .29, .35), source.b);
        vec3 day = mix(sea, terrain, land);
        vec3 dusk = day * vec3(.47, .53, .60) + vec3(.030, .040, .055) + emission * vec3(.93, .70, .36);
        vec3 color = mix(dusk, day * 1.12, daylight);
        float facing = clamp(dot(normal, normalize(cameraPosition - vSurfaceWorld)), 0., 1.);
        color *= mix(.82, 1., mix(smoothstep(0., .70, facing), 1., uSurfaceMorph));
        color = fijiReliefColor(color, vAtlas, normal);
        diffuseColor.rgb = atlasToLinear(clamp(color, 0., 1.));
      }
      #include <alphamap_fragment>
    `,
      );
  };
  ocean.customProgramCacheKey = () => key + "-earth-atlas-fiji";

  let lastView: SurfaceView | undefined;
  let failed = false;
  let loaded = 0;
  let disposed = false;
  const defaultDepth = night.uniforms["uDepth"]!.value;
  const defaultLift = night.uniforms["uLift"]!.value;
  function release() {
    terrain.value?.dispose();
    lights.value?.dispose();
    terrain.value = lights.value = null;
  }
  function load(url: string) {
    const texture = new TextureLoader().load(
      url,
      () => {
        if (!disposed && !failed && ++loaded === 2) wake();
      },
      undefined,
      () => {
        failed = true;
        release();
      },
    );
    texture.wrapS = RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  }
  return {
    fijiRegistration: relief.uniforms.uFijiRegistration,
    litAt: (at: number) => landingSolarTime(at, lastView?.landing ? solarOffsetMinutes() : 0),
    setView(view = lastView) {
      lastView = view;
      const visible = showsSatellite(view);
      if (visible && !failed && !terrain.value) {
        terrain.value = load(
          matchMedia("(max-width: 760px)").matches ? "/earth/terrain-small.webp" : "/earth/terrain.webp",
        );
        lights.value = load("/earth/lights.webp");
      }
      const hasRelief = relief.set(view?.cutaway?.descent ? (view.cutaway.sweepKm ?? 0) : undefined);
      const enabled = visible && loaded === 2;
      coast.visible = !(enabled && hasRelief);
      if (enabled === Boolean(strength.value)) return;
      strength.value = Number(enabled);
      fill.visible = !enabled;
      grid.transparent = coast.transparent = enabled;
      grid.opacity = enabled ? 0.22 : 1;
      coast.opacity = enabled ? 0.36 : 1;
      night.uniforms["uDepth"]!.value = enabled ? 0.12 : defaultDepth;
      night.uniforms["uLift"]!.value = enabled ? 0.023 : defaultLift;
      if (enabled) canvas.dataset.basemap = "satellite";
      else delete canvas.dataset.basemap;
    },
    dispose() {
      disposed = true;
      relief.dispose();
      delete canvas.dataset.basemap;
      release();
    },
  };
}
