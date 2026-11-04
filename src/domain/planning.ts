import { addDays, monday, type State, type Block, type Timer } from './model';
export function canSchedule(blocks: Block[], candidate: Block): boolean {
  return (
    candidate.start >= 0 &&
    candidate.duration >= 5 &&
    candidate.start + candidate.duration <= 1440 &&
    !blocks.some(
      (b) =>
        b.id !== candidate.id &&
        b.date === candidate.date &&
        b.start < candidate.start + candidate.duration &&
        candidate.start < b.start + b.duration,
    )
  );
}
export function remaining(timer: Timer, now: number): number {
  return Math.max(
    0,
    timer.remainingSeconds -
      (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince) / 1000),
  );
}
export function weekMinutes(s: State, goalId: string, date: string, actual = false): number {
  const start = monday(date),
    end = addDays(start, 7);
  return actual
    ? s.sessions
        .filter((x) => x.goalId === goalId)
        .reduce((sum, x) => {
          const d = new Date(x.endedAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return sum + (key >= start && key < end ? x.minutes : 0);
        }, 0)
    : s.blocks
        .filter((b) => b.goalId === goalId && b.date >= start && b.date < end)
        .reduce((sum, b) => sum + b.duration, 0);
}
export function recommendations(s: State, date: string) {
  return s.goals
    .map((g) => {
      const planned = weekMinutes(s, g.id, date),
        actual = weekMinutes(s, g.id, date, true);
      return { goal: g, planned, actual, gap: Math.max(0, g.weeklyMinutes - planned) };
    })
    .sort((a, b) => b.gap - a.gap);
}
export function draftWeek(s: State, date: string): Block[] {
  const start = monday(date),
    blocks = [...s.blocks],
    added: Block[] = [];
  const tasks = s.tasks.filter((t) => !t.done && !s.blocks.some((b) => b.taskId === t.id));
  const priority = { core: 0, secondary: 1, support: 2 };
  tasks.sort(
    (a, b) =>
      priority[s.goals.find((g) => g.id === a.goalId)?.priority ?? 'support'] -
      priority[s.goals.find((g) => g.id === b.goalId)?.priority ?? 'support'],
  );
  for (const task of tasks) {
    let placed = false;
    for (let day = 0; day < 5 && !placed; day++) {
      const d = addDays(start, day);
      if (d < date) continue;
      for (let minute = 9 * 60; minute + task.duration <= 17 * 60; minute += 15) {
        if (minute < 13 * 60 && minute + task.duration > 12 * 60) continue;
        const block: Block = {
          id: crypto.randomUUID(),
          taskId: task.id,
          goalId: task.goalId,
          areaId: task.areaId ?? null,
          title: task.title,
          date: d,
          start: minute,
          duration: task.duration,
          done: false,
        };
        if (canSchedule(blocks, block)) {
          blocks.push(block);
          added.push(block);
          placed = true;
          break;
        }
      }
    }
  }
  return added;
}
