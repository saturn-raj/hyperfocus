import { createWorkspaceStore } from './application/store';
import { BrowserRepository, STORAGE_KEY } from './infrastructure/storage';

/** The composition root is the only place connecting application policy to browser storage. */
export const workspace = createWorkspaceStore(new BrowserRepository());
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) workspace.reload();
});
