import { BufferAttribute, Mesh, PlaneGeometry, ShaderMaterial, TextureLoader } from "three";
import { MORPH_GLSL } from "../../globe/morph";
import { toVec3 } from "../../geo/sphere";
import type { PassageCamera } from "../tonga/passageSurface";
import relief from "./aloha-relief.webp";

export function attachPacificRelief(world: Pick<PassageCamera, "morph" | "spin" | "wake">, islands = false) {
  const geo = new PlaneGeometry(1, 1, 64, 48);
  const coords = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  const degrees = new Float32Array(coords.count * 2);
  for (let i = 0; i < coords.count; i++) {
    const lon = -162.997916667 + uv.getX(i) * 10;
    const lat = 18.002083333 + uv.getY(i) * 8;
    degrees.set([lon, lat], 2 * i);
    coords.setXYZ(i, ...toVec3(lon, lat, 1.004));
  }
  geo.setAttribute("aLonLat", new BufferAttribute(degrees, 2));
  let ready = false;
  let attached = true;
  const map = new TextureLoader().load(relief, () => {
    if (attached) {
      ready = true;
      world.wake();
    }
  });
  map.anisotropy = 4;
  const strength = { value: 0 };
  const material = new ShaderMaterial({
    uniforms: { uMorph: world.morph, uRelief: { value: map }, strength },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `${MORPH_GLSL}
      varying vec2 sheet;
      void main() {
        sheet = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(fmProject(position), 1.);
      }`,
    fragmentShader: `uniform sampler2D uRelief;
      uniform float strength;
      varying vec2 sheet;
      void main() {
        vec2 fromStation = (sheet - vec2(.5, .594)) * vec2(1.16, 1.);
        float distanceFromCast = length(fromStation);
        float radius = mix(.075, .405, strength);
        vec3 rgb = texture2D(uRelief, sheet).rgb;
        ${
          islands
            ? `
          // Faint deep-water relief follows the chain. Shallow terrain carries the detail.
          vec2 start = vec2(.14,.66), end = vec2(.76,.19), axis = end - start;
          vec2 nearest = start + axis * clamp(dot(sheet - start,axis) / dot(axis,axis),0.,1.);
          float nearChain = 1. - smoothstep(.035,.24,length(sheet - nearest));
          float interior = smoothstep(0.,.12,min(min(sheet.x,1.-sheet.x),min(sheet.y,1.-sheet.y)));
          float shoal = smoothstep(.24,.62,rgb.r);
          float relief = nearChain * (.23 + .77 * shoal);
          vec3 water = rgb * vec3(.36,.48,.50);
          gl_FragColor = vec4(mix(water,rgb,shoal), strength * interior * relief);
        `
            : `
          float cover = strength * (1. - smoothstep(radius * .60, radius, distanceFromCast));
          gl_FragColor = vec4(rgb, cover);
        `
        }
      }`,
  });
  const mesh = new Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = islands ? 2 : 7;
  mesh.visible = false;
  world.spin.add(mesh);
  return {
    show(amount: number) {
      mesh.visible = ready && amount > 0;
      strength.value = amount;
    },
    dispose() {
      attached = false;
      mesh.removeFromParent();
      map.dispose();
      material.dispose();
      geo.dispose();
    },
  };
}
