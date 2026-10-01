import { definePlugin } from '#engine/api.ts';
import { __Comp__ } from './__Comp__.ts';
import { __Comp__System } from './__Comp__System.ts';

/** __doc__ Add it to the game's plugins: `plugins: [...fpsKit(), __Comp__Plugin]`. */
export const __Comp__Plugin = definePlugin({
  name: '__name__',
  doc: '__doc__',
  components: [__Comp__],
  systems: [__Comp__System],
});
