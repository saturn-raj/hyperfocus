import { createWorkspaceStore } from './application/store';
import { BrowserRepository, STORAGE_KEY } from './infrastructure/storage';

/** The composition root is the only place connecting application policy to browser storage. */
export const workspace = createWorkspaceStore(new BrowserRepository());
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) workspace.reload();
});

import { createSeasonPlanner } from './application/plan-season';
import { GuidedCoach } from './infrastructure/guided-coach';
import { ConnectedCoach, coachStatus } from './infrastructure/connected-coach';
const guidedPlanner = createSeasonPlanner(new GuidedCoach());
const connectedPlanner = createSeasonPlanner(new ConnectedCoach());
export const planning = {
  status: coachStatus,
  forMode: (mode: 'guided' | 'connected') =>
    mode === 'connected' ? connectedPlanner : guidedPlanner,
};
