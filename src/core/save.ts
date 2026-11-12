// Save/load to localStorage (always wrapped in try/catch: private mode, quota, disabled storage).
export interface SaveData { chapter: number; moustache: boolean; photos: string[]; version: number }
const KEY = 'ma.save.v1';
export class Save {
  data: SaveData = { chapter: 0, moustache: true, photos: [], version: 1 };
  private found = false;
  constructor() { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.version === 1) { this.data = { ...this.data, ...d }; this.found = true; } } } catch { /* ignore */ } }
  has() { return this.found; }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); this.found = true; return true; } catch { return false; } }
  reset() { this.data.chapter = 0; this.data.photos = []; this.write(); }
  /** unlock chapter index (0-based) */
  unlock(i: number) { if (i > this.data.chapter) this.data.chapter = i; this.write(); }
}
