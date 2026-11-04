import { describe, it, expect, vi, afterEach } from 'vitest';
import { createState } from '../domain/seed';
import { createWorkspaceStore } from './store';
import type { Repository } from './ports';
function setup() {
  let saved = createState();
  const repository: Repository = {
    load: () => saved,
    save: (next) => {
      saved = next;
    },
  };
  return { repository, store: createWorkspaceStore(repository) };
}
afterEach(() => vi.useRealTimers());
describe('workspace commands', () => {
  it('publishes only after persistence succeeds and keeps the old snapshot on quota failure', () => {
    const { store, repository } = setup();
    const before = store.getState(),
      listener = vi.fn();
    store.subscribe(listener);
    repository.save = () => {
      throw new Error('Quota exceeded');
    };
    expect(() => store.updateSettings({ name: 'Raj' })).toThrow('Quota exceeded');
    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
  it('detaches deleted goal and task references while preserving historical blocks', () => {
    const { store } = setup();
    store.deleteGoal('g1');
    expect(store.getState().tasks.find((t) => t.id === 't1')?.goalId).toBeNull();
    store.deleteTask('t1');
    expect(store.getState().blocks.find((b) => b.id === 'b1')?.taskId).toBeNull();
    expect(store.getState().blocks.find((b) => b.id === 'b1')).toBeDefined();
  });
  it('preserves elapsed focus across pause, reload, resume and finish without completing the task', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T09:00:00Z'));
    const { store, repository } = setup();
    store.startFocus('Prototype', 25, 'g1', 't1');
    vi.advanceTimersByTime(60_000);
    store.toggleTimer();
    vi.advanceTimersByTime(120_000);
    const restored = createWorkspaceStore(repository);
    restored.toggleTimer();
    vi.advanceTimersByTime(60_000);
    restored.finishFocus(4);
    expect(restored.getState().sessions[0].minutes).toBe(2);
    expect(restored.getState().tasks.find((t) => t.id === 't1')?.done).toBe(false);
    expect(restored.getState().timer).toBeNull();
  });
  it('leaves corrupt data untouched until an explicit replacement', () => {
    const save = vi.fn();
    const store = createWorkspaceStore({
      load: () => {
        throw new Error('Corrupt');
      },
      save,
    });
    expect(store.getStartupError()).toContain('left untouched');
    expect(save).not.toHaveBeenCalled();
    expect(() => store.updateSettings({ name: 'Raj' })).toThrow('Recover');
    store.replaceState(createState(false));
    expect(store.getStartupError()).toBe('');
    expect(save).toHaveBeenCalledOnce();
  });
});
