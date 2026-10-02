/** Options read from the page URL: `?game=agent-engine&room=arena&edit=1&shot=1&frames=60&view=top`. */
export type UrlParams = {
  game: string;
  room: string;
  spawn: string;
  look: string;
  tuning: string[];
  seed: number;
  edit: boolean;
  /** Screenshot mode: scripted input, muted, runs `frames` ticks unrendered, then renders and sets ready. */
  shot: boolean;
  frames: number;
  /** Camera override "x,y,z" and look-at "x,y,z". */
  cam: [number, number, number] | undefined;
  at: [number, number, number] | undefined;
  /** "top" = overhead view of the whole room. */
  view: string;
  /** Shot mode: JSON playtest steps run before capture (same vocabulary as `npm run play`). */
  steps: string;
  debug: boolean;
};

const vec = (s: string | null): [number, number, number] | undefined => {
  const v = s?.split(',').map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? (v as [number, number, number]) : undefined;
};

export function readUrlParams(search = location.search): UrlParams {
  const q = new URLSearchParams(search);
  return {
    game: q.get('game') ?? '',
    room: q.get('room') ?? '',
    spawn: q.get('spawn') ?? '',
    look: q.get('look') ?? '',
    tuning: (q.get('tuning') ?? '').split(',').filter(Boolean),
    seed: Number(q.get('seed') ?? 1),
    edit: q.get('edit') === '1',
    shot: q.get('shot') === '1',
    frames: Number(q.get('frames') ?? 30),
    cam: vec(q.get('cam')),
    at: vec(q.get('at')),
    view: q.get('view') ?? '',
    steps: q.get('steps') ?? '',
    debug: q.get('debug') === '1',
  };
}
