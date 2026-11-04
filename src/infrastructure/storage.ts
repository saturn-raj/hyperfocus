import { stateSchema, type State } from '../domain/model';
import type { Repository } from '../application/ports';
export const STORAGE_KEY = 'hyperfocus:v1';
export class BrowserRepository implements Repository {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseBackup(raw) : null;
  }
  save(state: State) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateSchema.parse(state)));
  }
}
export function parseBackup(raw: string): State {
  if (raw.length > 10_000_000) throw new Error('Backup exceeds the 10 MB limit.');
  const result = stateSchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new Error(`Invalid backup: ${result.error.issues[0]?.message ?? 'unknown format'}`);
  return result.data;
}
export function download(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
