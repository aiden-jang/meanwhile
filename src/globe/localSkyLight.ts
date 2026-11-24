import { Mesh, PlaneGeometry, ShaderMaterial, Vector4, type PerspectiveCamera, type Vector3 } from "three";
import type { TonightView } from "../geo/tonight";
import { createLocalSkyLabels } from "./localSkyLabels";

export function createLocalSkyLight(sun: Vector3, up: Vector3, canvas: HTMLCanvasElement) {
  const labels = createLocalSkyLabels(canvas, up);
  const lens = new Vector4();
  const material = new ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vScreen;
      void main() {
        vScreen = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vScreen;
      uniform vec3 uSun, uLocalUp;
      uniform vec4 uLens;
      uniform float uReveal, uSolarLight;
      void main() {
        vec3 eye = vec3((vScreen + uLens.zw) * uLens.xy, -1.0);
        vec3 ray = normalize(vec3(dot(eye, viewMatrix[0].xyz),
          dot(eye, viewMatrix[1].xyz), dot(eye, viewMatrix[2].xyz)));
        float elevation = dot(ray, uLocalUp);
        float dusk = smoothstep(-0.27, -0.012, dot(uSun, uLocalUp)) * uSolarLight;
        float glow = exp(-8.0 * max(0.0, elevation));
        float warmth = pow(max(0.0, dot(ray, uSun)), 8.0) * dusk;
        vec3 blue = mix(vec3(0.055, 0.101, 0.176), vec3(0.18, 0.30, 0.49), dusk);
        vec3 sky = mix(blue, vec3(0.68, 0.33, 0.18), warmth * glow);
        float edge = exp(-100.0 * abs(elevation));
        vec3 ground = mix(vec3(0.024, 0.041, 0.066), sky, edge * (0.29 + dusk * 0.2));
        gl_FragColor = elevation < 0.0
          ? vec4(ground, uReveal)
          : vec4(sky, uReveal * (0.18 * glow + dusk * (0.16 + 0.62 * glow)));
      }
    `,
    uniforms: {
      uSun: { value: sun },
      uLocalUp: { value: up },
      uLens: { value: lens },
      uReveal: { value: 0 },
      uSolarLight: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const object = new Mesh(new PlaneGeometry(2, 2), material);
  object.frustumCulled = false;
  object.renderOrder = 20;

  return {
    object,
    draw(camera: PerspectiveCamera, amount: number, view: TonightView | null) {
      labels(camera, view);
      const reveal = Math.min(1, Math.max(0, (amount - 0.68) / 0.32));
      object.visible = reveal > 0;
      material.uniforms["uReveal"]!.value = reveal;
      // Use the same lens shift as the stars so the horizon stays aligned behind the panel.
      const matrix = camera.projectionMatrix.elements;
      lens.set(1 / matrix[0]!, 1 / matrix[5]!, matrix[8]!, matrix[9]!);
      const solarLight = 1 - (view?.sunCover ?? 0) ** 6;
      material.uniforms["uSolarLight"]!.value = solarLight;
      const daylight = Math.min(1, Math.max(0, (sun.dot(up) + 0.26) / 0.24)) * solarLight;
      const exposure = 0.34 + 0.66 * solarLight;
      return (1 - reveal * daylight * 0.9) * exposure;
    },
  };
}
