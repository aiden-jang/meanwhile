import { TextureLoader, Vector3, type Texture } from "three";
import { FIJI_TRANSECT } from "../geo/fijiSection";
import { toVec3 } from "../geo/sphere";

const geographic = ({ lon, lat }: { lon: number; lat: number }) => new Vector3(...toVec3(lon, lat, 1));
const west = geographic(FIJI_TRANSECT.west);
const north = west.clone().cross(geographic(FIJI_TRANSECT.east)).normalize();

export const fijiReliefShader = `
  uniform sampler2D uFijiRelief;
  uniform float uFijiOn, uFijiDepth, uFijiRegistration;
  uniform vec3 uSectionWest, uSectionEastward, uSectionNorth;
  vec3 fijiReliefColor(vec3 color, vec2 atlas, vec3 normal) {
    if (uFijiOn < .5 || uFijiRegistration <= .45) return color;
    vec2 degrees = vec2((fract(atlas.x + .5) - .5) * 360., atlas.y * 180. - 90.);
    float field = max(fwidth(atlas.x)*360., fwidth(atlas.y)*180.);
    float detail = smoothstep(.45,.95,uFijiRegistration) * (1. - smoothstep(.055,.17,field));
    vec2 region = (degrees - vec2(-11.997917,-26.997917)) / vec2(24.,15.);
    vec2 border = min(region, 1. - region);
    float cover = detail * smoothstep(0., .15, min(border.x,border.y));
    if (cover > 0.) {
      vec2 sampleUV = (clamp(region,0.,1.) * vec2(960.,600.) + .5) / vec2(961.,601.);
      color = mix(color, texture2D(uFijiRelief,sampleUV).rgb, cover);
    }
    float along = 6371. * atan(dot(normal,uSectionEastward), dot(normal,uSectionWest));
    float across = 6371. * asin(clamp(dot(normal,uSectionNorth), -1., 1.));
    float edge = max(max(-along, along-900.), max(-across, across-100.));
    float surroundings = smoothstep(0., 70., edge);
    return mix(color, vec3(.025,.047,.06), .87 * surroundings * uFijiDepth * detail);
  }
`;

export function createFijiRelief(wake: () => void) {
  const image = { value: null as Texture | null };
  const active = { value: 0 };
  const depth = { value: 0 };
  let requested: Texture | undefined;
  let wanted = false;
  let disposed = false;
  return {
    uniforms: {
      uFijiRelief: image,
      uFijiOn: active,
      uFijiDepth: depth,
      uFijiRegistration: { value: 0 },
      uSectionWest: { value: west },
      uSectionNorth: { value: north },
      uSectionEastward: { value: north.clone().cross(west) },
    },
    set(km?: number) {
      wanted = km !== undefined;
      if (wanted && !requested) {
        requested = new TextureLoader().load("/fiji/relief.webp", (texture) => {
          if (disposed) return;
          texture.anisotropy = 4;
          image.value = texture;
          active.value = Number(wanted);
          wake();
        });
      }
      active.value = Number(wanted && !!image.value);
      depth.value = Math.min(1, (km ?? 0) / 320);
      return active.value > 0;
    },
    dispose() {
      disposed = true;
      requested?.dispose();
    },
  };
}
