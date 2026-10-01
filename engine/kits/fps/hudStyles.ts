/** CSS for the FPS HUD (injected once by FpsHud). */
export const HUD_CSS = `
.fps-hud { position: absolute; inset: 0; pointer-events: none; font: 600 15px/1.2 ui-sans-serif, system-ui, sans-serif;
  color: #f2f4f8; text-shadow: 0 1px 2px rgba(0,0,0,.8); }
.fps-hud .cross { position: absolute; left: 50%; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; }
.fps-hud .cross::before, .fps-hud .cross::after { content: ''; position: absolute; background: rgba(255,255,255,.85); box-shadow: 0 0 2px #000; }
.fps-hud .cross::before { left: 8px; top: 2px; width: 2px; height: 14px; }
.fps-hud .cross::after { top: 8px; left: 2px; height: 2px; width: 14px; }
.fps-hud .hit { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px; opacity: 0;
  background: linear-gradient(45deg, transparent 45%, #fff 45%, #fff 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, #fff 45%, #fff 55%, transparent 55%); }
.fps-hud .bl { position: absolute; left: 22px; bottom: 18px; }
.fps-hud .br { position: absolute; right: 22px; bottom: 18px; text-align: right; }
.fps-hud .big { font-size: 34px; font-weight: 800; letter-spacing: .02em; }
.fps-hud .bar { width: 180px; height: 6px; background: rgba(255,255,255,.18); margin-top: 4px; }
.fps-hud .bar > i { display: block; height: 100%; background: #6ee07a; }
.fps-hud .armor > i { background: #6ab8ff; }
.fps-hud .keys span { display: inline-block; width: 14px; height: 14px; margin-right: 4px; border: 1px solid #000; }
.fps-hud .msgs { position: absolute; top: 18%; left: 0; right: 0; text-align: center; font-size: 19px; }
.fps-hud .msgs div { transition: opacity .4s; }
.fps-hud .prompt { position: absolute; left: 0; right: 0; top: calc(50% + 34px); text-align: center; font-size: 15px; }
.fps-hud .prompt b { display: inline-block; border: 1px solid #fff; padding: 0 6px; margin-right: 6px; }
.fps-hud .score { position: absolute; right: 22px; top: 16px; font-size: 20px; }
.fps-hud .flash { position: absolute; inset: 0; opacity: 0; background: radial-gradient(ellipse at center, transparent 45%, rgba(220,0,0,.75)); }
.fps-hud .dead { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(60,0,0,.45);
  font-size: 46px; font-weight: 900; letter-spacing: .15em; }
.fps-hud .play { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%); padding: 10px 18px; background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.4); font-size: 16px; }
`;
