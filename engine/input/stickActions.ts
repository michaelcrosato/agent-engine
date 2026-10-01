/**
 * Maps a virtual stick offset (pixels from its centre, +y = down) to analog movement actions.
 * Pushing to the rim (beyond `sprintAt` of the radius) forward also sprints.
 */
export function stickActions(
  dx: number,
  dy: number,
  radius: number,
  deadzone = 0.15,
  sprintAt = 0.92,
): Map<string, number> {
  const out = new Map<string, number>();
  const len = Math.hypot(dx, dy) / radius;
  if (len <= deadzone) return out;
  const k = Math.min(1, (Math.min(len, 1) - deadzone) / (1 - deadzone)) / len;
  const x = (dx / radius) * k;
  const y = (dy / radius) * k;
  if (x > 0) out.set('moveRight', x);
  if (x < 0) out.set('moveLeft', -x);
  if (y < 0) out.set('moveForward', -y);
  if (y > 0) out.set('moveBack', y);
  if (len >= sprintAt && -dy > Math.abs(dx)) out.set('sprint', 1);
  return out;
}
