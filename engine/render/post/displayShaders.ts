import type { PassData } from '../PostStack.ts';

type Shader = { uniforms: Record<string, { value: unknown }>; vertexShader: string; fragmentShader: string };

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const frag = (uniforms: string, body: string) => /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
${uniforms}
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  ${body}
  gl_FragColor = c;
}`;

/** Display-space (after tone mapping) shader for a post pass type, or undefined for non-shader passes. */
export function displayShader(p: PassData): Shader | undefined {
  const base = { resolution: { value: [1, 1] }, time: { value: 0 }, tDiffuse: { value: null } };
  switch (p.type) {
    case 'vignette':
      return {
        uniforms: { ...base, amount: { value: p.amount }, softness: { value: p.softness } },
        vertexShader,
        fragmentShader: frag(
          'uniform float amount; uniform float softness;',
          'float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - amount * smoothstep(0.75 - softness, 0.75, d * 1.2);',
        ),
      };
    case 'grade':
      return {
        uniforms: {
          ...base,
          saturation: { value: p.saturation },
          contrast: { value: p.contrast },
          brightness: { value: p.brightness },
          tint: { value: hex(p.tint) },
        },
        vertexShader,
        fragmentShader: frag(
          'uniform float saturation; uniform float contrast; uniform float brightness; uniform vec3 tint;',
          'float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c.rgb = mix(vec3(l), c.rgb, saturation);' +
            'c.rgb = (c.rgb - 0.5) * contrast + 0.5 + brightness; c.rgb *= tint;',
        ),
      };
    case 'grain':
      return {
        uniforms: { ...base, amount: { value: p.amount } },
        vertexShader,
        fragmentShader: frag(
          'uniform float amount;',
          'float n = fract(sin(dot(vUv * resolution + time * 61.0, vec2(12.9898, 78.233))) * 43758.5453);' +
            'c.rgb += (n - 0.5) * amount;',
        ),
      };
    case 'chromatic':
      return {
        uniforms: { ...base, amount: { value: p.amount } },
        vertexShader,
        fragmentShader: frag(
          'uniform float amount;',
          'vec2 dir = (vUv - 0.5) * amount; c.r = texture2D(tDiffuse, vUv + dir).r; c.b = texture2D(tDiffuse, vUv - dir).b;',
        ),
      };
    case 'pixelate':
      return {
        uniforms: { ...base, size: { value: p.size } },
        vertexShader,
        fragmentShader: frag(
          'uniform float size;',
          'vec2 px = size / resolution; c = texture2D(tDiffuse, (floor(vUv / px) + 0.5) * px);',
        ),
      };
    case 'scanlines':
      return {
        uniforms: { ...base, amount: { value: p.amount }, count: { value: p.count } },
        vertexShader,
        fragmentShader: frag(
          'uniform float amount; uniform float count;',
          'c.rgb *= 1.0 - amount * (0.5 + 0.5 * sin(vUv.y * count * 6.2832));',
        ),
      };
    case 'posterize':
      return {
        uniforms: { ...base, levels: { value: p.levels } },
        vertexShader,
        fragmentShader: frag('uniform float levels;', 'c.rgb = floor(c.rgb * levels + 0.5) / levels;'),
      };
    default:
      return undefined;
  }
}

function hex(h: string): [number, number, number] {
  const n = Number.parseInt(h.replace('#', '').padEnd(6, '0'), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
