import { Euler, Group, Quaternion, Vector3 } from 'three';
import { defineService } from '../../core/defineService.ts';
import { defineSystem } from '../../core/defineSystem.ts';
import { Health } from '../../mechanics/health/Health.ts';
import { PuppetKind } from '../../model/Puppet.ts';
import { CharacterBody } from '../../physics/CharacterBody.ts';
import { buildPuppet, disposePuppet, type PuppetInstance } from '../../render/buildPuppet.ts';
import { RendererKey } from '../../render/Renderer.ts';
import { Arsenal } from './Arsenal.ts';
import { FpsController } from './FpsController.ts';
import { weaponData } from './weaponData.ts';
import { WeaponFired } from './weaponEvents.ts';

type ViewmodelState = {
  group: Group;
  weapon: string;
  inst: PuppetInstance | undefined;
  kick: number;
  swayX: number;
  swayY: number;
};

export const ViewmodelKey = defineService<ViewmodelState>(
  'viewmodel',
  'First-person weapon model state (browser only).',
);

const REST = new Vector3(0.2, -0.21, -0.56);
const e = new Euler();
const q = new Quaternion();

/** Shows the current weapon's viewmodel puppet in front of the camera with procedural motion. */
export const ViewmodelSystem = defineSystem({
  name: 'ViewmodelSystem',
  doc: 'First-person weapon model: sway, bob, recoil, reload and switch animation (browser only).',
  phase: 'frame',
  order: 58,
  run(ctx) {
    const r = ctx.engine.tryService(RendererKey);
    const fired = ctx.events.read(WeaponFired);
    if (!r) return;
    let vm = ctx.engine.tryService(ViewmodelKey);
    if (!vm) {
      vm = { group: new Group(), weapon: '', inst: undefined, kick: 0, swayX: 0, swayY: 0 };
      r.camera.add(vm.group);
      ctx.engine.provide(ViewmodelKey, vm);
    }
    const w = ctx.world;
    const p = w.query(Arsenal, FpsController)[0];
    const a = p !== undefined ? w.get(p, Arsenal) : undefined;
    const id = a?.weapons[a.current] ?? '';
    const puppet = id ? weaponData(ctx.content, id).viewmodel : '';
    const key = `${id}|${r.lookId}`;
    if (key !== vm.weapon) {
      vm.weapon = key;
      if (vm.inst) {
        vm.group.remove(vm.inst.root);
        disposePuppet(vm.inst);
        vm.inst = undefined;
      }
      if (puppet && ctx.content.has(PuppetKind, puppet)) {
        vm.inst = buildPuppet(ctx.content.get(PuppetKind, puppet).parts, { materials: r.materials });
        vm.inst.root.traverse((o) => {
          o.castShadow = false;
          o.renderOrder = 10;
        });
        vm.group.add(vm.inst.root);
      }
    }
    if (!vm.inst || p === undefined || !a) return;
    vm.group.visible = !w.get(p, Health)?.dead && r.cameraOverride === undefined;
    const dt = ctx.time.frameDt;
    if (fired.some((f) => f.shooter === p)) vm.kick = 1;
    vm.kick = Math.max(0, vm.kick - dt * 7);
    vm.swayX += (-ctx.input.look.x * 0.004 - vm.swayX) * Math.min(1, dt * 10);
    vm.swayY += (ctx.input.look.y * 0.004 - vm.swayY) * Math.min(1, dt * 10);
    const c = w.get(p, FpsController)!;
    const cb = w.get(p, CharacterBody);
    const move = cb?.grounded ? Math.min(1, Math.hypot(cb.velocity.x, cb.velocity.z) / 7) : 0;
    const reload = a.reloading > 0 ? Math.sin(Math.min(1, a.reloading / 0.4) * Math.PI) : 0;
    const raise = a.switching / 0.3;
    vm.group.position.set(
      REST.x + vm.swayX + Math.cos(c.bobPhase) * 0.012 * move,
      REST.y +
        vm.swayY -
        Math.abs(Math.sin(c.bobPhase)) * 0.012 * move -
        reload * 0.12 -
        raise * 0.25 -
        c.landKick * 0.04,
      REST.z + vm.kick * 0.06,
    );
    e.set(vm.kick * 0.12 - reload * 0.5, vm.swayX * 2, 0);
    vm.group.quaternion.copy(q.setFromEuler(e));
  },
});
