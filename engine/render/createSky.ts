import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';
import type { Look } from './Look.ts';

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 top;
uniform vec3 horizon;
uniform vec3 bottom;
uniform float stars;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, bottom, pow(-h, 0.4));
  if (stars > 0.0 && h > 0.0) {
    vec3 cell = floor(vDir * 180.0);
    float s = step(1.0 - 0.0015 * stars, hash(cell));
    c += vec3(s) * smoothstep(0.05, 0.4, h) * 0.9;
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** A camera-centered gradient sky dome (top / horizon / bottom colors, optional stars). */
export function createSky(sky: Look['sky']): Mesh {
  const lin = (hex: string) => new Color(hex);
  const mat = new ShaderMaterial({
    uniforms: {
      top: { value: lin(sky.top) },
      horizon: { value: lin(sky.horizon) },
      bottom: { value: lin(sky.bottom) },
      stars: { value: sky.stars },
    },
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const mesh = new Mesh(new SphereGeometry(1, 32, 16), mat);
  mesh.name = 'sky';
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  mesh.scale.setScalar(500);
  return mesh;
}
