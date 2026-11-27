import { BufferAttribute, Mesh, PlaneGeometry, ShaderMaterial, TextureLoader } from "three";
import { MORPH_GLSL } from "../../globe/morph";
import { toVec3 } from "../../geo/sphere";
import type { PassageCamera } from "../tonga/passageSurface";
import relief from "./aloha-relief.webp";

export function attachPacificRelief(world: PassageCamera) {
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
        float cover = strength * (1. - smoothstep(radius * .60, radius, distanceFromCast));
        gl_FragColor = vec4(texture2D(uRelief, sheet).rgb, cover);
      }`,
  });
  const mesh = new Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
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
