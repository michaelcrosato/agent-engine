/** Styles for the in-browser editor panels (injected once). */
export const EDITOR_CSS = `
.ed-root { position: absolute; inset: 0; pointer-events: none; z-index: 30; color: #dfe7ee;
  font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; }
.ed-root[hidden] { display: none; }
.ed-panel { position: absolute; top: 8px; bottom: 8px; width: 250px; overflow: auto; pointer-events: auto;
  background: rgba(14, 18, 24, 0.93); border: 1px solid #2a3542; border-radius: 6px; padding: 8px 10px;
  box-sizing: border-box; }
.ed-palette { left: 8px; }
.ed-inspector { right: 8px; width: 320px; }
.ed-panel h3 { margin: 2px 0 6px; font-size: 13px; color: #fff; overflow-wrap: anywhere; }
.ed-panel h4 { margin: 12px 0 4px; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #8aa0b4; }
.ed-panel p { margin: 4px 0; }
.ed-panel .bar { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
.ed-panel button { background: #1d2631; color: #dfe7ee; border: 1px solid #334252; border-radius: 4px;
  padding: 3px 7px; cursor: pointer; font: inherit; }
.ed-panel button:hover:not(:disabled) { border-color: #5b7fa6; }
.ed-panel button.on { background: #2f6fb3; border-color: #4f8fd3; color: #fff; }
.ed-panel button:disabled { opacity: 0.45; cursor: default; }
.ed-panel .glyphs { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; }
.ed-panel .glyphs button { font-family: ui-monospace, Menlo, monospace; padding: 3px 0; }
.ed-panel .prefabs { display: flex; flex-direction: column; gap: 2px; max-height: 36vh; overflow: auto; margin-top: 4px; }
.ed-panel .prefabs button { text-align: left; }
.ed-panel input, .ed-panel select, .ed-panel textarea { background: #0f141a; color: #e8eef3; border: 1px solid #334252;
  border-radius: 3px; font: inherit; padding: 2px 4px; box-sizing: border-box; min-width: 0; }
.ed-panel select, .ed-panel input[type=search] { width: 100%; }
.ed-panel .row { display: grid; grid-template-columns: 96px minmax(0, 1fr) auto; gap: 4px; align-items: center; margin: 3px 0; }
.ed-panel .row label { color: #b9c7d4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed-panel .row.over label { color: #ffd479; font-weight: 600; }
.ed-panel .row input[type=text], .ed-panel .row select, .ed-panel .row textarea { width: 100%; }
.ed-panel .vec { display: flex; gap: 2px; }
.ed-panel .vec input { width: 100%; }
.ed-panel .color { display: flex; gap: 4px; }
.ed-panel .color input[type=color] { width: 32px; padding: 0; height: 22px; }
.ed-panel details { border-top: 1px solid #263240; padding: 4px 0; }
.ed-panel summary { cursor: pointer; font-weight: 600; color: #fff; }
.ed-panel .dim { color: #8aa0b4; overflow-wrap: anywhere; }
.ed-panel .status { color: #9fd3a8; min-height: 1.2em; overflow-wrap: anywhere; }
.ed-panel textarea.bad { border-color: #ff6b6b; }
.ed-panel .reset { padding: 0 5px; }
.ed-panel .help { color: #8aa0b4; font: 11px/1.45 ui-monospace, Menlo, monospace; white-space: pre-wrap; margin-top: 12px; }
.engine-overlay.ed-editing .engine-debug { left: 270px; top: auto; bottom: 12px; max-width: calc(100vw - 620px); }
.ed-badge { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); padding: 4px 10px; border-radius: 4px;
  background: rgba(14, 18, 24, 0.85); color: #dfe7ee; font: 12px system-ui, sans-serif; pointer-events: none; z-index: 30; }
`;
