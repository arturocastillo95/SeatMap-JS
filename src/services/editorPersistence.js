import { DraftStore } from './DraftStore.js';
import { FileManager } from '../managers/fileManager.js';
import { SMFValidator } from '../core/smfValidator.js';

export function startEditorPersistence({ onStatus } = {}) {
  const drafts = new DraftStore({ snapshot: () => FileManager.exportToJSON(),
    restore: map => FileManager.importFromJSON(map, { source: 'recovery', reportErrors: false }),
    validate: map => SMFValidator.validate(map), onStatus });
  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => drafts.flush(), 750); };
  const flush = () => drafts.flush();
  const saved = event => drafts.markSaved(event.detail.map);
  const loaded = event => { if (event.detail.source === 'file') drafts.markSaved(); else schedule(); };
  const beforeUnload = event => {
    drafts.flush();
    if (drafts.dirty) { event.preventDefault(); event.returnValue = ''; }
  };
  const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
  const events = ['input', 'change', 'pointerup', 'keyup', 'click'];
  for (const type of events) document.addEventListener(type, schedule);
  document.addEventListener('seatmap:saved', saved);
  document.addEventListener('seatmap:loaded', loaded);
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', beforeUnload);
  const interval = setInterval(flush, 5000);
  return {
    drafts,
    hasUnsavedChanges() { try { drafts.check(); } catch { /* Keep the last known state during import. */ } return drafts.dirty; },
    destroy() {
      clearTimeout(timer); clearInterval(interval);
      for (const type of events) document.removeEventListener(type, schedule);
      document.removeEventListener('seatmap:saved', saved);
      document.removeEventListener('seatmap:loaded', loaded);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', beforeUnload);
    },
  };
}
