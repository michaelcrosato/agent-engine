/** Easing curves for keyframes and movers. Input and output in 0..1. */
export const EASINGS = {
  linear: (t: number) => t,
  smooth: (t: number) => t * t * (3 - 2 * t),
  sine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  in: (t: number) => t * t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  step: (t: number) => (t < 1 ? 0 : 1),
  back: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  },
} as const;

export type EasingName = keyof typeof EASINGS;
export const EASING_NAMES = Object.keys(EASINGS) as [EasingName, ...EasingName[]];
