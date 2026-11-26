import { BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, ShaderChunk, Vector3 } from "three";
import { morphable } from "./morph";

export function createObservationRaster(morph: { value: number }) {
  const raster = new Mesh(
    new BufferGeometry(),
    new MeshBasicMaterial({
      side: DoubleSide,
      forceSinglePass: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  morphable(raster.material, morph);
  const sweep = { value: 1 };
  const divider = { value: -1 };
  const feather = { value: 0 };
  const fold = { value: 0 };
  const aperture = { value: new Vector3(0, 0, -1) };
  const compileRaster = raster.material.onBeforeCompile;
  raster.material.onBeforeCompile = (shader, renderer) => {
    compileRaster(shader, renderer);
    shader.uniforms.sweep = sweep;
    shader.uniforms.surveyDivider = divider;
    shader.uniforms.surveyAperture = aperture;
    shader.uniforms.observationFeather = feather;
    shader.uniforms.observationFold = fold;
    const mapFragment = ShaderChunk.map_fragment.replace(
      "texture2D( map, vMapUv )",
      `texture2D( map, surveyDivider < 0.0 ? vMapUv :
        vec2(vMapUv.x, 0.5 * clamp(vMapUv.y, 0.001, 0.999) + 0.5 * (1.0 - (surveyAperture.z >= 0.0
          ? step(surveyAperture.z, distance(gl_FragCoord.xy, surveyAperture.xy))
          : step(surveyDivider, vMapUv.x)))))`,
    );
    shader.fragmentShader =
      `uniform float sweep;\nuniform float surveyDivider;\nuniform vec3 surveyAperture;\nuniform float observationFeather;\nuniform float observationFold;\n${shader.fragmentShader}`.replace(
        "#include <map_fragment>",
        `${mapFragment}
       #ifdef USE_MAP
       diffuseColor.a *= smoothstep(vMapUv.x - 0.025, vMapUv.x + 0.025, sweep);
       if (observationFeather > 0.0) {
         vec2 edgeUv = min(vMapUv, 1.0 - vMapUv);
         diffuseColor.a *= smoothstep(0.0, observationFeather, min(edgeUv.x, edgeUv.y));
       }
       if (observationFold > 0.0) {
         vec2 centered = abs(2.0 * vMapUv - 1.0);
         float edge = 1.1 * (1.0 - observationFold);
         diffuseColor.a *= 1.0 - smoothstep(edge - 0.08, edge, max(centered.x, centered.y));
       }
       if (surveyAperture.z < 0.0 && surveyDivider > 0.0 && surveyDivider < 1.0) {
         float edge = fwidth(vMapUv.x);
         float white = 1.0 - smoothstep(0.1 * edge, 1.2 * edge, abs(vMapUv.x - surveyDivider));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90, 0.92, 0.90), white);
       }
       #endif`,
      );
  };
  raster.material.customProgramCacheKey = () => "fm-morph-radar-sweep-survey";
  return { raster, sweep, divider, feather, fold, aperture };
}
