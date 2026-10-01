/** Styles for the on-screen touch controls (injected once by TouchInput). */
export const TOUCH_CSS = `
.touch-controls { position: absolute; inset: 0; z-index: 10; pointer-events: none; touch-action: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.touch-controls[hidden] { display: none; }
.touch-move, .touch-look { position: absolute; top: 0; bottom: 0; pointer-events: auto; touch-action: none; }
.touch-move { left: 0; width: 42%; }
.touch-look { left: 42%; right: 0; }
.touch-stick { position: absolute; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.35); background: rgba(0,0,0,.18); display: none; pointer-events: none; }
.touch-stick.on { display: block; }
.touch-knob { position: absolute; left: 50%; top: 50%; width: 50px; height: 50px; margin: -25px 0 0 -25px;
  border-radius: 50%; background: rgba(255,255,255,.55); }
.touch-btn { position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  pointer-events: auto; touch-action: none; color: #fff; font: 800 14px system-ui, sans-serif; letter-spacing: .04em;
  background: rgba(20,24,30,.42); border: 2px solid rgba(255,255,255,.45); text-shadow: 0 1px 2px #000; }
.touch-btn.on { background: rgba(255,255,255,.35); }
.touch-full { left: 12px; top: 12px; width: 40px; height: 40px; border-radius: 8px; font-size: 20px; }
`;
