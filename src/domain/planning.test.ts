import { describe, it, expect } from 'vitest';
import { addDays, localDate, monday, stateSchema, type Block } from './model';
import { canSchedule, remaining, draftWeek, weekMinutes } from './planning';
import { createState } from './seed';
const block: Block = {
  id: 'a',
  taskId: null,
  goalId: null,
  title: 'Work',
  date: '2026-11-04',
  start: 540,
  duration: 60,
  done: false,
};
describe('scheduling boundaries', () => {
  it('rejects intersections while allowing adjacent blocks and other dates', () => {
    expect(canSchedule([block], { ...block, id: 'b', start: 570 })).toBe(false);
    expect(canSchedule([block], { ...block, id: 'b', start: 600 })).toBe(true);
    expect(canSchedule([block], { ...block, id: 'b', date: '2026-11-05' })).toBe(true);
    expect(canSchedule([block], { ...block, start: 570 })).toBe(true);
    expect(canSchedule([], { ...block, start: 1430 })).toBe(false);
  });
  it('drafts unfinished tasks without conflicts or duplicated scheduling', () => {
    const s = createState(false);
    s.tasks = Array.from({ length: 18 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      goalId: null,
      duration: 90,
      done: i === 0,
    }));
    s.blocks = [block];
    const draft = draftWeek(s, '2026-11-02');
    expect(draft.length).toBeGreaterThan(0);
    expect(draft.some((b) => b.taskId === 't0')).toBe(false);
    for (const b of draft) {
      expect(canSchedule([...s.blocks, ...draft.filter((x) => x.id !== b.id)], b)).toBe(true);
      expect(b.start).toBeGreaterThanOrEqual(540);
      expect(b.start + b.duration).toBeLessThanOrEqual(1020);
      expect(b.start < 780 && b.start + b.duration > 720).toBe(false);
    }
    expect(draftWeek({ ...s, blocks: [...s.blocks, ...draft] }, '2026-11-02')).toHaveLength(0);
  });
  it('does not draft into elapsed weekdays', () => {
    const s = createState(true);
    s.blocks = [];
    const draft = draftWeek(s, '2026-11-06');
    expect(draft.every((b) => b.date === '2026-11-06')).toBe(true);
    expect(draftWeek(s, '2026-11-07')).toHaveLength(0);
  });
  it('counts the selected week and selected goal', () => {
    const s = createState();
    s.blocks = [
      { ...block, goalId: 'g1' },
      { ...block, id: 'c', goalId: 'g1', date: '2026-11-09' },
    ];
    expect(weekMinutes(s, 'g1', '2026-11-04')).toBe(60);
    expect(weekMinutes(s, 'g2', '2026-11-04')).toBe(0);
  });
});
describe('timers and civil dates', () => {
  const t = {
    id: 'timer',
    goalId: null,
    taskId: null,
    title: 'Work',
    durationSeconds: 1500,
    remainingSeconds: 1500,
    startedAt: 1000,
    runningSince: 1000,
  };
  it('derives elapsed time across reloads and clamps clock reversal and expiration', () => {
    expect(remaining(t, 61000)).toBe(1440);
    expect(remaining(t, 0)).toBe(1500);
    expect(remaining(t, 2000000)).toBe(0);
    expect(remaining({ ...t, runningSince: null, remainingSeconds: 100 }, 2000000)).toBe(100);
  });
  it('handles month, year, leap-day and DST boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(monday('2026-11-01')).toBe('2026-10-26');
    expect(localDate(new Date(2026, 10, 4, 0, 1))).toBe('2026-11-04');
  });
  it('rejects invalid dates, dangling references, duplicate IDs, and invalid timers', () => {
    const s = createState();
    expect(
      stateSchema.safeParse({ ...s, season: { ...s.season, end: '2026-02-30' } }).success,
    ).toBe(false);
    expect(
      stateSchema.safeParse({ ...s, tasks: [{ ...s.tasks[0], goalId: 'missing' }] }).success,
    ).toBe(false);
    expect(stateSchema.safeParse({ ...s, goals: [...s.goals, s.goals[0]] }).success).toBe(false);
    expect(stateSchema.safeParse({ ...s, timer: { ...t, remainingSeconds: 1501 } }).success).toBe(
      false,
    );
  });
});
