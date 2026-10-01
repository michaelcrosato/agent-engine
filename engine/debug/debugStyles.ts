/** Styles for the debug overlay (injected once). */
export const DEBUG_CSS = `
.engine-debug {
  position: absolute; left: 12px; top: 12px; max-width: min(760px, 70vw); max-height: 80vh; overflow: auto;
  padding: 10px 12px; border-radius: 6px; background: rgba(8, 12, 18, 0.82); color: #cfe3f2;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre;
  pointer-events: none; z-index: 20;
}
.engine-debug b { color: #ffffff; }
.engine-debug .dim { color: #7f93a6; }
.engine-debug .bad { color: #ff8a80; }
`;
