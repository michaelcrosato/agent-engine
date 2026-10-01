import type { Editor } from './Editor.ts';
import type { RoomDoc } from './RoomDoc.ts';

/**
 * Editor keyboard shortcuts (ignored while typing in a panel field or flying with the right
 * mouse button). F2 switches play/edit, Shift+F2 plays from below the camera.
 */
export function handleEditorKey(ed: Editor, e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.code === 'F2') {
    e.preventDefault();
    if (ed.mode === 'edit') ed.enterPlay(e.shiftKey);
    else ed.enterEdit();
    return;
  }
  if (ed.mode !== 'edit' || ed.fly.flying) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const i = ed.selection?.index;
  const selectLast = (d: RoomDoc) => ed.select(ed.tools.entityAt(`entities[${d.entities().length - 1}]`));
  if (ctrl && e.code === 'KeyS') void ed.save();
  else if (ctrl && e.code === 'KeyZ') e.shiftKey ? ed.redo() : ed.undo();
  else if (ctrl && e.code === 'KeyY') ed.redo();
  else if (ctrl && e.code === 'KeyD' && i !== undefined) ed.change((d) => d.duplicate(i) >= 0, selectLast);
  else if (ctrl) return;
  else if (e.code === 'KeyV') ed.setTool('select');
  else if (e.code === 'KeyB') ed.setTool('paint');
  else if (e.code === 'Escape') ed.tool === 'select' ? ed.select(undefined) : ed.setTool('select');
  else if ((e.code === 'Delete' || e.code === 'Backspace') && i !== undefined) {
    ed.selection = undefined;
    ed.change((d) => d.remove(i));
  } else if (e.code === 'KeyR' && i !== undefined) ed.change((d) => d.rotate(i, e.shiftKey ? -15 : 15));
  else if (e.code === 'KeyT') ed.frameRoom(true);
  else if (e.code === 'KeyF') {
    const p = ed.tools.focusPoint();
    if (p) ed.fly.focus(p);
  } else return;
  e.preventDefault();
}
