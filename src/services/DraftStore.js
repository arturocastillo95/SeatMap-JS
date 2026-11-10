import { mapFingerprint } from './mapSnapshot.js';

export const DRAFT_KEY = 'seatmap:editor-draft:v1';

/** One recoverable draft per origin; compare before writing to protect other tabs. */
export class DraftStore {
  constructor({ snapshot, restore, validate, storage = () => localStorage, onStatus = () => {} }) {
    Object.assign(this, { snapshot, restore, validate, storage, onStatus });
    this.baseline = mapFingerprint(snapshot());
    this.expected = null;
    this.pending = false;
    this.blocked = false;
    this.dirty = false;
    this.lastFingerprint = null;
    try {
      this.expected = this.storage().getItem(DRAFT_KEY);
      this.pending = this.expected !== null;
      this.status(this.pending ? 'recovery' : 'ready');
    } catch { this.blocked = true; this.status('unavailable'); }
  }

  status(state) { this.state = state; this.onStatus({ state, dirty: this.dirty, pending: this.pending }); }

  check() {
    const map = this.snapshot();
    this.dirty = mapFingerprint(map) !== this.baseline;
    return map;
  }

  ownsDraft() {
    if (this.storage().getItem(DRAFT_KEY) === this.expected) return true;
    this.blocked = true;
    this.status('conflict');
    return false;
  }

  flush() {
    let map;
    try { map = this.check(); } catch { return false; } // An import may own the scene.
    if (this.pending || this.blocked) return false;
    try {
      if (!this.ownsDraft()) return false;
      const fingerprint = mapFingerprint(map);
      if (!this.dirty) {
        if (this.expected !== null) this.storage().removeItem(DRAFT_KEY);
        this.expected = null; this.lastFingerprint = null;
        this.status('ready'); return true;
      }
      if (fingerprint === this.lastFingerprint) return true;
      const raw = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), map });
      this.storage().setItem(DRAFT_KEY, raw);
      this.expected = raw; this.lastFingerprint = fingerprint;
      this.status('saved'); return true;
    } catch { this.status('unavailable'); return false; }
  }

  markSaved(map = this.snapshot()) {
    this.baseline = mapFingerprint(map);
    this.dirty = false;
    this.flush();
  }

  async recover() {
    if (!this.pending || this.blocked) return false;
    try {
      if (!this.ownsDraft()) return false;
      const draft = JSON.parse(this.expected);
      if (draft.version !== 1 || !this.validate(draft.map).valid) throw new Error('Invalid draft');
      if (!await this.restore(draft.map)) { this.status('invalid'); return false; }
      this.pending = false;
      this.baseline = ''; // Recovered work still needs a downloaded file.
      this.lastFingerprint = mapFingerprint(this.snapshot());
      this.dirty = true;
      this.status('saved'); return true;
    } catch { this.status('invalid'); return false; }
  }

  discard() {
    try {
      if (!this.ownsDraft()) return false;
      this.storage().removeItem(DRAFT_KEY);
      this.expected = null; this.pending = false; this.lastFingerprint = null;
      this.status('ready');
      return true;
    } catch { this.status('unavailable'); return false; }
  }
}
