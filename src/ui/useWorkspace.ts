import { useSyncExternalStore } from 'react';
import { workspace } from '../bootstrap';

export function useStore() {
  return useSyncExternalStore(workspace.subscribe, workspace.getState);
}
export const {
  saveOnboardingDraft,
  completeOnboarding,
  restartOnboarding,
  getState,
  getStartupError,
  commit,
  replaceState,
  updateSettings,
  saveGoal,
  deleteGoal,
  saveTask,
  completeTask,
  deleteTask,
  saveBlock,
  removeBlock,
  startFocus,
  toggleTimer,
  finishFocus,
  discardFocus,
  addReflection,
} = workspace;
