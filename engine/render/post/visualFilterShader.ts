/** Display-space color treatment with depth/normal ink lines and a visible-surface selection mask. */
export const visualFilterShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tSurface, tDepth;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, style, scope, pixelRatio;
    varying vec2 vUv;
    float viewDepth(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return cameraNear * cameraFar / (cameraFar - d * (cameraFar - cameraNear));
    }
    float edgeAt(vec2 uv, vec3 normal, float depth) {
      float otherDepth = viewDepth(uv);
      vec3 other = texture2D(tSurface, uv).rgb * 2.0 - 1.0;
      // Only the foreground side of a silhouette gets ink: no dark halo on an unselected neighbor.
      float silhouette = smoothstep(0.012, 0.045, (otherDepth - depth) / max(depth, 0.2));
      float crease = smoothstep(0.24, 0.55, 1.0 - dot(normal, other));
      return max(silhouette, crease * (1.0 - step(depth * 0.04, abs(otherDepth - depth))));
    }
    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      vec4 surface = texture2D(tSurface, vUv);
      float subject = step(0.5, surface.a);
      float selected = scope < 0.5 ? 1.0 : (scope < 1.5 ? 1.0 - subject : subject);
      vec3 c = original.rgb;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      if (style > 2.5) {
        c = mix(vec3(luma), c, 1.23);
        c = (c - 0.5) * 1.045 + 0.5;
        c += vec3(0.015, 0.005, -0.012) * (1.0 - luma);
      } else {
        float levels = style > 1.5 ? 5.0 : 8.0;
        float band = floor(luma * levels + 0.5) / levels;
        c *= mix(luma, band, 0.35) / max(luma, 0.001);
        if (style > 1.5) {
          c = mix(vec3(luma), c, 0.72) * vec3(1.04, 1.01, 0.94);
          // Screen-print dots stay one consistent CSS size at any render scale.
          vec2 grid = mod(gl_FragCoord.xy / pixelRatio, 5.0) - 2.5;
          float radius = (1.0 - smoothstep(0.12, 0.72, luma)) * 1.45;
          float dotInk = 1.0 - smoothstep(radius - 0.35, radius + 0.35, length(grid));
          c *= 1.0 - dotInk * 0.22;
        }
        float depth = viewDepth(vUv);
        if (depth < cameraFar * 0.95) {
          vec2 px = pixelRatio * (style > 1.5 ? 1.25 : 0.85) / resolution;
          vec3 normal = normalize(surface.rgb * 2.0 - 1.0);
          float edge = max(max(edgeAt(vUv + vec2(px.x, 0.0), normal, depth),
                               edgeAt(vUv - vec2(px.x, 0.0), normal, depth)),
                           max(edgeAt(vUv + vec2(0.0, px.y), normal, depth),
                               edgeAt(vUv - vec2(0.0, px.y), normal, depth)));
          c = mix(c, vec3(0.035, 0.065, 0.080), edge * (style > 1.5 ? 0.90 : 0.78));
        }
      }
      gl_FragColor = vec4(mix(original.rgb, clamp(c, 0.0, 1.0), selected), original.a);
    }
  `,
};
