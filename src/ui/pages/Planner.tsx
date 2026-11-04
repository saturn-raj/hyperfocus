import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  GripVertical,
  Plus,
  Sparkles,
  Play,
  Pencil,
} from 'lucide-react';
import { useStore, commit, completeTask, startFocus, saveBlock } from '../useWorkspace';
import {
  addDays,
  clock,
  hours,
  localDate,
  monday,
  type Block,
  type Task,
} from '../../domain/model';
import { draftWeek, recommendations } from '../../domain/planning';
import { TaskEditor, BlockEditor } from '../components/Editors';
import { Modal } from '../components/Modal';
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, opts);
export function Planner({ notify, onFocus }: { notify: (s: string) => void; onFocus: () => void }) {
  const s = useStore(),
    today = localDate();
  const [anchor, setAnchor] = useState(today),
    [view, setView] = useState<'week' | 'day'>(() =>
      matchMedia('(max-width: 760px)').matches ? 'day' : 'week',
    ),
    [editingTask, setEditingTask] = useState<Task | true | null>(null),
    [editingBlock, setEditingBlock] = useState<{
      block?: Block;
      task?: Task;
      date?: string;
      start?: number;
    } | null>(null),
    [draft, setDraft] = useState<Block[] | null>(null);
  const first = view === 'week' ? monday(anchor) : anchor;
  const days = Array.from({ length: view === 'week' ? 7 : 1 }, (_, i) => addDays(first, i));
  const week = s.blocks.filter(
    (b) => b.date >= monday(anchor) && b.date < addDays(monday(anchor), 7),
  );
  const scheduled = week.reduce((sum, b) => sum + b.duration, 0),
    target = s.goals.reduce((sum, g) => sum + g.weeklyMinutes, 0);
  const tasks = s.tasks.filter((t) => !t.done);
  const recs = recommendations(s, anchor);
  const earliest = Math.min(
      8,
      ...s.blocks.filter((b) => days.includes(b.date)).map((b) => Math.floor(b.start / 60)),
    ),
    latest = Math.max(
      19,
      ...s.blocks
        .filter((b) => days.includes(b.date))
        .map((b) => Math.ceil((b.start + b.duration) / 60)),
    );
  function run(action: () => void) {
    try {
      action();
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR TIME, WITH INTENTION</div>
          <h1>Make room for what matters.</h1>
          <p>A little clarity. A realistic plan. Space to do your best work.</p>
        </div>
        <button className="button primary" onClick={() => setDraft(draftWeek(s, anchor))}>
          <Sparkles size={16} /> Draft my week
        </button>
      </div>
      <div className="planner-layout">
        <aside className="planning-rail">
          <section className="season-mini">
            <div className="section-label">
              THIS SEASON{' '}
              <span>
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date(`${s.season.end}T12:00:00`).getTime() -
                      new Date(`${today}T12:00:00`).getTime()) /
                      86400000,
                  ),
                )}{' '}
                days left
              </span>
            </div>
            <h3>{s.season.title}</h3>
            <div className="goal-mini-list">
              {s.goals.length ? (
                s.goals.map((g) => (
                  <div className="goal-mini" key={g.id}>
                    <span className={`goal-dot ${g.color}`} />
                    <span>{g.title}</span>
                    <small>{hours(g.weeklyMinutes)}/w</small>
                  </div>
                ))
              ) : (
                <p className="muted">Add your first goal in Season.</p>
              )}
            </div>
          </section>
          <section className="task-section">
            <div className="section-label">
              NEXT ACTIONS{' '}
              <button
                className="icon-button"
                aria-label="Add task"
                onClick={() => setEditingTask(true)}
              >
                <Plus size={17} />
              </button>
            </div>
            <p className="hint">Drag a task into your week, or choose a time.</p>
            <div className="task-list">
              {tasks.map((t) => {
                const goal = s.goals.find((g) => g.id === t.goalId),
                  isScheduled = s.blocks.some((b) => b.taskId === t.id && !b.done);
                return (
                  <div
                    className="task-item"
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/task-id', t.id)}
                  >
                    <div className="task-line">
                      <GripVertical size={13} className="drag-grip" />
                      <button
                        className="icon-button check-task"
                        aria-label={`Complete ${t.title}`}
                        onClick={() => run(() => completeTask(t.id))}
                      >
                        <Circle size={17} />
                      </button>
                      <button className="task-title" onClick={() => setEditingTask(t)}>
                        {t.title}
                      </button>
                    </div>
                    <div className="task-meta">
                      <span className={`goal-tag ${goal?.color ?? 'neutral'}`}>
                        {goal?.title ?? 'Personal'}
                      </span>
                      <span>{hours(t.duration)}</span>
                      <button
                        className="icon-button"
                        aria-label={`Schedule ${t.title}`}
                        onClick={() => setEditingBlock({ task: t, date: anchor })}
                      >
                        {isScheduled ? <Check size={14} /> : <CalendarDays size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!tasks.length ? (
                <div className="empty-small">
                  <Check size={22} />
                  <p>Room for a fresh start.</p>
                  <button className="text-button" onClick={() => setEditingTask(true)}>
                    Add a next action
                  </button>
                </div>
              ) : null}
            </div>
            <button className="add-task" onClick={() => setEditingTask(true)}>
              <Plus size={16} /> Add a task
            </button>
            {s.tasks.some((t) => t.done) ? (
              <details className="completed-tasks">
                <summary>Completed ({s.tasks.filter((t) => t.done).length})</summary>
                {s.tasks
                  .filter((t) => t.done)
                  .map((t) => (
                    <button key={t.id} onClick={() => run(() => completeTask(t.id))}>
                      <Check size={14} />
                      {t.title}
                    </button>
                  ))}
              </details>
            ) : null}
          </section>
        </aside>
        <section className="calendar-panel">
          <div className="calendar-toolbar">
            <div className="calendar-title">
              <h2>{fmt(anchor, { month: 'long', year: 'numeric' })}</h2>
              <div className="nav-buttons">
                <button
                  className="icon-button"
                  aria-label="Previous period"
                  onClick={() => setAnchor(addDays(anchor, view === 'week' ? -7 : -1))}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next period"
                  onClick={() => setAnchor(addDays(anchor, view === 'week' ? 7 : 1))}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
              <button className="button small subtle" onClick={() => setAnchor(today)}>
                Today
              </button>
            </div>
            <div className="calendar-view">
              <div className="segmented">
                <button
                  aria-pressed={view === 'day'}
                  className={view === 'day' ? 'active' : ''}
                  onClick={() => setView('day')}
                >
                  Day
                </button>
                <button
                  aria-pressed={view === 'week'}
                  className={view === 'week' ? 'active' : ''}
                  onClick={() => setView('week')}
                >
                  Week
                </button>
              </div>
              <button
                className="icon-button"
                aria-label="Add time block"
                onClick={() => setEditingBlock({ date: anchor })}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="calendar-scroll">
            <div
              className={`calendar ${view}`}
              style={{ '--days': days.length } as React.CSSProperties}
            >
              <div className="day-head">
                <div className="timezone">
                  {Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone.split('/')
                    .pop()
                    ?.replace(/_/g, ' ')}
                </div>
                {days.map((d) => (
                  <button
                    key={d}
                    className={`day-label ${d === today ? 'is-today' : ''}`}
                    onClick={() => {
                      setAnchor(d);
                      setView('day');
                    }}
                  >
                    <span>{fmt(d, { weekday: 'short' })}</span>
                    <strong>{fmt(d, { day: 'numeric' })}</strong>
                  </button>
                ))}
              </div>
              <div className="calendar-body" style={{ height: (latest - earliest) * 68 }}>
                <div className="time-labels">
                  {Array.from({ length: latest - earliest }, (_, i) => (
                    <span key={i} style={{ top: i * 68 }}>
                      {clock((earliest + i) * 60)}
                    </span>
                  ))}
                </div>
                {days.map((d) => (
                  <div
                    key={d}
                    className={`day-column ${d === today ? 'current-day' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const task = s.tasks.find(
                        (t) => t.id === e.dataTransfer.getData('text/task-id'),
                      );
                      const block = s.blocks.find(
                        (b) => b.id === e.dataTransfer.getData('text/block-id'),
                      );
                      const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                      const start = earliest * 60 + Math.floor((y / 68) * 4) * 15;
                      if (task) setEditingBlock({ task, date: d, start });
                      else if (block) run(() => saveBlock({ ...block, date: d, start }));
                    }}
                  >
                    {Array.from({ length: latest - earliest }, (_, i) => (
                      <button
                        className="hour-cell"
                        key={i}
                        style={{ top: i * 68 }}
                        aria-label={`Add block ${d} ${clock((earliest + i) * 60)}`}
                        onClick={() => setEditingBlock({ date: d, start: (earliest + i) * 60 })}
                      />
                    ))}
                    {s.blocks
                      .filter((b) => b.date === d)
                      .map((b) => {
                        const goal = s.goals.find((g) => g.id === b.goalId);
                        return (
                          <div
                            key={b.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData('text/block-id', b.id);
                            }}
                            className={`calendar-block ${goal?.color ?? 'neutral'} ${b.done ? 'done' : ''} ${b.duration <= 30 ? 'compact' : ''}`}
                            style={{
                              top: ((b.start - earliest * 60) / 60) * 68,
                              height: Math.max(23, (b.duration / 60) * 68 - 3),
                            }}
                          >
                            <button
                              className="block-content"
                              aria-label={`Edit ${b.title}`}
                              onClick={() => setEditingBlock({ block: b })}
                            >
                              <span>{b.title}</span>
                              {b.duration > 30 ? (
                                <small>
                                  {clock(b.start)} – {clock(b.start + b.duration)}
                                </small>
                              ) : null}
                            </button>
                            {b.duration >= 45 ? (
                              <button
                                className="block-play"
                                aria-label={`Focus on ${b.title}`}
                                onClick={() =>
                                  run(() => {
                                    startFocus(b.title, b.duration, b.goalId, b.taskId);
                                    onFocus();
                                  })
                                }
                              >
                                <Play size={12} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    {d === today &&
                    new Date().getHours() * 60 + new Date().getMinutes() >= earliest * 60 &&
                    new Date().getHours() * 60 + new Date().getMinutes() < latest * 60 ? (
                      <div
                        className="now-line"
                        style={{
                          top:
                            ((new Date().getHours() * 60 +
                              new Date().getMinutes() -
                              earliest * 60) /
                              60) *
                            68,
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="calendar-footer">
            <span>
              <span className="status-dot" /> {hours(scheduled)} planned this week
            </span>
            <span>
              {hours(Math.max(0, target - scheduled))} of goal time still to make room for
            </span>
          </div>
        </section>
      </div>
      <section className="coach-strip">
        <div className="coach-icon">
          <Sparkles size={21} />
        </div>
        <div>
          <div className="section-label">A SMALL NUDGE</div>
          <p>
            {recs[0]?.gap ? (
              <>
                Your <strong>{recs[0].goal.title.toLowerCase()}</strong> goal could use{' '}
                {hours(recs[0].gap)} more this week. Start with one small block.
              </>
            ) : s.goals.length ? (
              'Your goals have room in the plan. Leave some breathing space, too.'
            ) : (
              'Start with one goal that would make this season meaningful.'
            )}
          </p>
          <small>Based on your weekly targets. Suggestions run entirely on your device.</small>
        </div>
        <button className="text-button" onClick={() => setEditingBlock({ date: anchor })}>
          Make space <ChevronRight size={16} />
        </button>
      </section>
      <section className="today-agenda">
        <div className="label-row">
          <h2>Today, at a glance</h2>
          <span className="muted">
            {fmt(today, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        {s.blocks
          .filter((b) => b.date === today)
          .sort((a, b) => a.start - b.start)
          .map((b) => (
            <div className="agenda-row" key={b.id}>
              <time>{clock(b.start)}</time>
              <span
                className={`goal-dot ${s.goals.find((g) => g.id === b.goalId)?.color ?? 'neutral'}`}
              />
              <span className={b.done ? 'struck' : ''}>{b.title}</span>
              <small>{hours(b.duration)}</small>
              <button
                className="icon-button"
                aria-label={`Edit agenda ${b.title}`}
                onClick={() => setEditingBlock({ block: b })}
              >
                <Pencil size={15} />
              </button>
              <button
                className="button small"
                onClick={() =>
                  run(() => {
                    startFocus(b.title, b.duration, b.goalId, b.taskId);
                    onFocus();
                  })
                }
              >
                <Play size={12} /> Focus
              </button>
            </div>
          ))}
        {!s.blocks.some((b) => b.date === today) ? (
          <p className="muted">A clear day. Make time for one thing that matters.</p>
        ) : null}
      </section>
      {editingTask ? (
        <TaskEditor
          task={editingTask === true ? undefined : editingTask}
          onClose={() => setEditingTask(null)}
        />
      ) : null}
      {editingBlock ? (
        <BlockEditor {...editingBlock} onClose={() => setEditingBlock(null)} />
      ) : null}
      {draft ? (
        <Modal
          wide
          title="Your week, with a little help"
          description="A local scheduling rule places unfinished tasks into free weekday slots from 09:00 to 17:00, leaving noon free. Review the proposal before adding it."
          onClose={() => setDraft(null)}
        >
          {draft.length ? (
            <>
              <div className="draft-list">
                {draft.map((b) => (
                  <div key={b.id}>
                    <div>
                      <strong>{b.title}</strong>
                      <small>
                        {fmt(b.date, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                        {clock(b.start)} · {hours(b.duration)}
                      </small>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setDraft(draft.filter((x) => x.id !== b.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <span className="muted">{draft.length} blocks to add</span>
                <button
                  className="button primary"
                  onClick={() =>
                    run(() => {
                      commit({ ...s, blocks: [...s.blocks, ...draft] });
                      notify('Your plan is ready. Adjust it as life happens.');
                      setDraft(null);
                    })
                  }
                >
                  Add to my week
                </button>
              </div>
            </>
          ) : (
            <p className="empty-small">
              No unscheduled tasks fit this week. Add a task, shorten its duration, or move to
              another week.
            </p>
          )}
        </Modal>
      ) : null}
    </>
  );
}
