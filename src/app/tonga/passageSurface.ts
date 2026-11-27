import { CanvasTexture, LinearFilter, Mesh, ShaderMaterial, SphereGeometry, Texture, Vector2 } from "three";
import type { Group } from "three";
import type { Controls } from "../../globe/controlsTypes";
import type { PassageOptics } from "../../globe/scenePresentation";
import { attachLonLat, MORPH_GLSL, SPHERE_PHI_START } from "../../globe/morph";
import { ORIGIN, sprite, infrared, latestScan, waveAngle } from "./tongaTimeline";
import scanUrl from "./infrared.webp?url";

export interface PassageCamera {
  spin: Group;
  morph: { value: number };
  optics: PassageOptics;
  controls: Controls;
  afterRender: Set<() => void>;
  wake: () => void;
}

const radians = Math.PI / 180;
// Navigation constants and the ABI fixed-grid steps are from the C13 file used by the archive.
const a = 6378.137,
  b = 6356.75231414,
  height = a + 35786.023;
const step = 0.000056;
function scanAt(lon: number, lat: number) {
  const p = lat * radians,
    l = (lon + 137) * radians;
  const n = a / Math.sqrt(1 - (1 - (b / a) ** 2) * Math.sin(p) ** 2);
  const sx = height - n * Math.cos(p) * Math.cos(l);
  const sy = n * Math.cos(p) * Math.sin(l);
  const sz = n * (b / a) ** 2 * Math.sin(p);
  return [Math.asin(sy / Math.hypot(sx, sy, sz)), Math.atan2(sz, sx)] as const;
}
const [x0, y0] = scanAt(ORIGIN.lon, ORIGIN.lat);
const col = Math.round((x0 + 0.151844) / step);
const row = Math.round((0.151844 - y0) / step);
let atlasReady: Promise<HTMLImageElement> | undefined;
export function preparePassage() {
  if (!atlasReady) {
    const scan = new Image();
    scan.src = scanUrl;
    atlasReady = scan
      .decode()
      .then(() => scan)
      .catch((error: unknown) => {
        atlasReady = undefined;
        throw error;
      });
  }
  return atlasReady;
}

function lettering() {
  const sheet = document.createElement("canvas");
  sheet.width = 1024;
  sheet.height = 512;
  const ctx = sheet.getContext("2d")!;
  const texture = new CanvasTexture(sheet);
  let disposed = false;
  const draw = () => {
    if (disposed) return;
    ctx.clearRect(0, 0, 1024, 512);
    ctx.textBaseline = "alphabetic";
    ctx.font = '600 460px "Alumni Sans"';
    const metrics = ctx.measureText("Tonga");
    const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    ctx.save();
    ctx.scale(1008 / width, 492 / height);
    ctx.fillStyle = "#fff";
    ctx.fillText(
      "Tonga",
      metrics.actualBoundingBoxLeft + (6 * width) / 1008,
      metrics.actualBoundingBoxAscent + (12 * height) / 492,
    );
    ctx.restore();
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts.load('600 44px "Alumni Sans"').then(draw, () => {});
  return {
    texture,
    dispose() {
      disposed = true;
      texture.dispose();
    },
  };
}

export function createPassageSurface(camera: PassageCamera) {
  const texture = new Texture();
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  const title = lettering();
  const uniforms = {
    uMorph: camera.morph,
    atlas: { value: texture },
    title: { value: title.texture },
    scanCell: { value: new Vector2() },
    archive: { value: 0 },
    ink: { value: 0 },
    wave: { value: 0 },
    wordSize: { value: new Vector2(innerWidth < 680 ? 2.65 : 6.45, innerWidth < 680 ? 0.97 : 2.48) },
    radius: { value: 0 },
  };
  const geo = new SphereGeometry(1.005, 192, 120, SPHERE_PHI_START);
  attachLonLat(geo);
  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      ${MORPH_GLSL}
      varying vec2 ll;
      void main() {
        ll = aLonLat;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(fmProject(position), 1.0);
      }`,
    fragmentShader: `
      varying vec2 ll;
      uniform sampler2D atlas;
      uniform sampler2D title;
      uniform vec2 scanCell, wordSize;
      uniform float archive, ink, wave, radius;
      const float pi = 3.14159265359;
      void main() {
        vec2 delta = vec2(mod(ll.x + ${-ORIGIN.lon} + 180.0,360.0)-180.0, ll.y - (${ORIGIN.lat}));
        vec3 base = vec3(0.0);
        float opacity = 0.0;
        if (archive > 0.001 && abs(delta.x)<22.0 && abs(delta.y)<12.0) {
          vec2 angles = radians(vec2(ll.x + 137.0,ll.y));
          float n = 6378.137 / sqrt(1.0 - 0.00669438 * (sin(angles.y)*sin(angles.y)));
          float x = 42164.16 - n*cos(angles.y)*cos(angles.x);
          float y = n*cos(angles.y)*sin(angles.x);
          float z = 0.99330562*n*sin(angles.y);
          float sx = asin(y/length(vec3(x,y,z)));
          float sy = atan(z,x);
          vec2 pixel = vec2((sx+0.151844)/0.000056-${col}.0, (0.151844-sy)/0.000056-${row}.0);
          vec2 uv = (pixel+vec2(320.5,184.5))/vec2(640.,368.);
          float rim = min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
          float footprint = length((uv-.5)*vec2(1.84,1.55));
          opacity = smoothstep(0.0,0.16,rim)*(1.-smoothstep(.63,1.,footprint))*archive;
          vec2 cell = clamp(uv,vec2(.001,.002),vec2(.999,.998));
          base = texture2D(atlas,vec2((scanCell.x+cell.x)/2.,1.-(scanCell.y+cell.y)/5.)).rgb;
          // The brightest photographed clouds pass in front of the geographic lettering.
          vec2 word = vec2(delta.x/wordSize.x+0.94,delta.y/wordSize.y+0.44);
          if (min(min(word.x,1.-word.x),min(word.y,1.-word.y))>0.) {
            float cloud = smoothstep(.32,.64,dot(base,vec3(.2126,.7152,.0722)));
            float glyph = texture2D(title,word).a * (1.-cloud) * ink;
            base = mix(base,vec3(.92,.95,.93),glyph);
          }
        }
        vec2 rad = radians(ll);
        float lat0 = radians(${ORIGIN.lat});
        vec2 halfSin = sin(vec2(rad.y-lat0,radians(delta.x))*.5);
        float h = halfSin.x*halfSin.x + cos(rad.y)*cos(lat0)*halfSin.y*halfSin.y;
        float distance = 2.*asin(sqrt(clamp(h,0.,1.)));
        float edge = distance-radius;
        float px = max(.0004,fwidth(distance));
        float line = (1.-smoothstep(px*.35,px*1.85,abs(edge))) * .94;
        float echo = (1.-smoothstep(px*.25,px*1.1,abs(edge+.026))) * .25;
        float wake = exp(-abs(edge)/.013)*step(edge,0.)*.25;
        float front = clamp(line+echo+wake,0.,1.)*wave;
        float outA = opacity + front*(1.-opacity);
        if (outA < .002) discard;
        vec3 c = (base*opacity*(1.-front) + vec3(.66,.90,.87)*front)/max(outA,.001);
        gl_FragColor=vec4(c,outA);
      }`,
  });
  const mesh = new Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  camera.spin.add(mesh);
  return {
    setScan(image: HTMLImageElement) {
      texture.image = image;
      texture.needsUpdate = true;
    },
    update(minute: number, archive: number, ink: number, wave: number) {
      const cell = latestScan(infrared, minute);
      uniforms.scanCell.value.set(cell % sprite.columns, Math.floor(cell / sprite.columns));
      uniforms.archive.value = texture.image ? archive : 0;
      uniforms.ink.value = ink;
      uniforms.wave.value = wave;
      uniforms.radius.value = waveAngle(minute);
    },
    detach() {
      mesh.removeFromParent();
      material.dispose();
      geo.dispose();
      texture.dispose();
      title.dispose();
    },
  };
}
