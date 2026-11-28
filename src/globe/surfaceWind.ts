import {
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
} from "three";
import { windAt, type WindGrid } from "../geo/windGrid";
import { MORPH_GLSL } from "./morph";

const stride = 4;
const wrap = (x: number) => ((x + 540) % 360) - 180;

function geometry(grid: WindGrid) {
  const origins: number[] = [],
    ends: number[] = [],
    samples: number[] = [],
    counts: number[] = [];
  for (let level = 0; level < 3; level++) {
    for (let row = 0; row < (grid.rows - 1) * stride; row++) {
      const parallel = Math.cos(((grid.north + (row * grid.dy) / stride) * Math.PI) / 180);
      const across = parallel < 0.29 ? 4 : parallel < 0.66 ? 2 : 1;
      for (let col = 0; col < grid.columns * stride; col += across) {
        const column = col / across;
        const tier = row % 4 === 0 && column % 4 === 0 ? 0 : row % 2 === 0 && column % 2 === 0 ? 1 : 2;
        if (tier !== level) continue;
        const seed = Math.sin(col * 14.13 + row * 37.1) * 4371.57;
        const phase = seed - Math.floor(seed);
        const lon = wrap(grid.west + ((col + (phase - 0.5) * 0.44) * grid.dx) / stride);
        const lat = grid.north + ((row + Math.sin(seed) * 0.22) * grid.dy) / stride;
        const vector = windAt(grid, lon, lat);
        if (!vector || vector.speed < 0.5) continue;
        const cosLat = Math.max(0.12, Math.cos((lat * Math.PI) / 180));
        origins.push(lon, lat);
        ends.push(lon + vector.east / (vector.speed * cosLat), lat + vector.north / vector.speed);
        samples.push(vector.speed, tier, phase);
      }
    }
    counts.push(samples.length / 3);
  }
  const g = new InstancedBufferGeometry();
  g.setAttribute(
    "position",
    new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0], 3),
  );
  g.setAttribute("aLonLat", new InstancedBufferAttribute(Float32Array.from(origins), 2));
  g.setAttribute("downwind", new InstancedBufferAttribute(Float32Array.from(ends), 2));
  g.setAttribute("sampleData", new InstancedBufferAttribute(Float32Array.from(samples), 3));
  g.instanceCount = samples.length / 3;
  return { geometry: g, counts };
}

export function createSurfaceWind(morph: { value: number }) {
  const screen = { value: new Vector2(1, 1) },
    clock = { value: 0 },
    weight = { value: 1 },
    zoom = { value: 1 };
  const material = new ShaderMaterial({
    uniforms: { uMorph: morph, screen, clock, weight, zoom },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      ${MORPH_GLSL}
      attribute vec2 downwind;
      attribute vec3 sampleData;
      uniform vec2 screen;
      uniform float clock;
      uniform float zoom;
      varying vec2 ink;
      varying float strokeLength;
      varying float alpha;
      varying float speed;
      vec3 sphere(vec2 ll) {
        vec2 r = radians(ll);
        return 1.004 * vec3(cos(r.y)*sin(r.x),sin(r.y),cos(r.y)*cos(r.x));
      }
      vec4 place(vec2 ll) { return projectionMatrix * modelViewMatrix * vec4(fmProjectAt(sphere(ll), ll), 1.0); }
      void main() {
        vec4 anchor = place(aLonLat), end = place(downwind);
        vec2 direction = (end.xy/end.w - anchor.xy/anchor.w) * screen * 0.5;
        float pixels = max(length(direction), 0.001);
        vec2 along = direction / pixels;
        speed = sampleData.x;
        alpha = sampleData.y < 0.5 ? 1.0 : sampleData.y < 1.5 ? smoothstep(5.6,10.0,pixels) : smoothstep(15.0,27.0,pixels);
        alpha *= sampleData.y < 0.5 ? 1.0 : sampleData.y < 1.5 ? smoothstep(1.45,2.2,zoom) : smoothstep(2.35,3.35,zoom);
        alpha *= mix(0.68,1.0,smoothstep(3.0,14.0,pixels));
        float spacing = pixels * mix(6.0, 1.5, smoothstep(4.0,19.0,pixels));
        strokeLength = clamp(min(spacing * 0.77, 9.0 + speed * 1.25), 3.0, 33.0);
        float motion = clock < 0.0 ? 0.0 : smoothstep(1.7,2.5,zoom);
        float phase = fract(max(0.0,clock) + sampleData.z);
        float drift = smoothstep(0.0,0.14,phase) * (1.0-smoothstep(0.84,1.0,phase));
        alpha *= mix(0.82,drift*0.94,motion);
        float shift = (phase - 0.5) * min(pixels * 0.85, 11.0) * motion;
        ink = vec2(position.x * (strokeLength + 3.0) - 1.5, position.y * 4.5);
        vec2 offset = along * (ink.x - strokeLength * 0.5 + shift) + vec2(-along.y,along.x) * ink.y;
        gl_Position = anchor;
        gl_Position.xy += offset * (2.0 / screen) * anchor.w;
      }`,
    fragmentShader: `
      varying vec2 ink;
      varying float strokeLength;
      varying float alpha;
      varying float speed;
      uniform float weight;
      float segment(vec2 p,vec2 a,vec2 b) {
        vec2 s=b-a; return length(p-a-s*clamp(dot(p-a,s)/dot(s,s),0.0,1.0));
      }
      void main() {
        float tip=clamp(strokeLength*0.22,1.0,4.2);
        float shaft=segment(ink,vec2(0.),vec2(strokeLength,0.));
        float wing=segment(vec2(ink.x,abs(ink.y)),vec2(strokeLength-tip,tip*0.62),vec2(strokeLength,0.));
        float d=min(shaft,wing);
        float line=1.0-smoothstep(0.32,1.10,d);
        float edge=1.0-smoothstep(0.80,1.72,d);
        vec3 color=mix(vec3(0.58,0.77,0.84),vec3(0.66,0.93,0.88),smoothstep(5.0,11.0,speed));
        color=mix(color,vec3(0.97,0.79,0.55),smoothstep(15.0,19.0,speed));
        gl_FragColor=vec4(mix(vec3(0.035,0.09,0.12),color,line),edge*alpha*weight);
      }`,
  });
  const mesh = new Mesh(new InstancedBufferGeometry(), material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 5.1;
  mesh.onBeforeRender = (renderer) =>
    screen.value.set(renderer.domElement.clientWidth || 1, renderer.domElement.clientHeight || 1);
  let previous: WindGrid | undefined,
    phase = 0;
  let tierCounts: number[] = [];
  return {
    mesh,
    set(grid?: WindGrid) {
      if (grid === previous) return;
      previous = grid;
      mesh.geometry.dispose();
      const field = grid && geometry(grid);
      mesh.geometry = field?.geometry ?? new InstancedBufferGeometry();
      tierCounts = field?.counts ?? [];
      mesh.visible = !!grid;
    },
    step(dt: number, reduced: boolean, strength: number, viewZoom: number) {
      if (!mesh.visible) return false;
      zoom.value = viewZoom;
      mesh.geometry.instanceCount = tierCounts[viewZoom <= 1.45 ? 0 : viewZoom <= 2.35 ? 1 : 2] ?? 0;
      weight.value = strength;
      const drifting = !reduced && viewZoom > 1.7 && strength > 0.01;
      if (drifting) phase = (phase + dt / 3.2) % 1;
      clock.value = drifting ? phase : -1;
      return drifting;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
