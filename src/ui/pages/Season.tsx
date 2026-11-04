import { useState } from 'react';
import { Plus, ArrowUpRight, Flag, Check } from 'lucide-react';
import { useStore, commit, saveGoal } from '../useWorkspace';
import { hours, localDate, type Goal } from '../../domain/model';
import { weekMinutes } from '../../domain/planning';
import { GoalEditor } from '../components/Editors';
import { Modal } from '../components/Modal';
export function Season({ notify }: { notify: (s: string) => void }) {
  const s = useStore();
  const [editing, setEditing] = useState<Goal | true | null>(null),
    [editSeason, setEditSeason] = useState(false);
  const today = localDate();
  const total = Math.max(
      1,
      (new Date(s.season.end).valueOf() - new Date(s.season.start).valueOf()) / 86400000 + 1,
    ),
    elapsed = Math.max(
      0,
      Math.min(
        total,
        (new Date(today).valueOf() - new Date(s.season.start).valueOf()) / 86400000 + 1,
      ),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CLARITY BEFORE ACTIVITY</div>
          <h1>Your season.</h1>
          <p>A few meaningful goals. Small steps. A direction to come back to.</p>
        </div>
        <button className="button primary" onClick={() => setEditing(true)}>
          <Plus size={17} /> New goal
        </button>
      </div>
      {s.onboarding.draft?.commitment && s.onboarding.completedAt ? (
        <section className="season-commitment">
          <Flag size={21} />
          <div>
            <div className="eyebrow">YOUR SEASON STARTS WITH A PROMISE</div>
            <p>{s.onboarding.draft.commitment}</p>
            <small>
              Signed {s.onboarding.draft.signature} ·{' '}
              {new Date(s.onboarding.completedAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </small>
          </div>
        </section>
      ) : null}
      <section className="season-banner">
        <div>
          <span className="eyebrow">
            DAY {Math.round(elapsed)} OF {Math.round(total)}
          </span>
          <h2>{s.season.title}</h2>
          <p>
            {new Date(`${s.season.start}T12:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            –{' '}
            {new Date(`${s.season.end}T12:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <button className="text-button" onClick={() => setEditSeason(true)}>
            Edit season <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="season-progress">
          <div className="large-number">
            {Math.round((elapsed / total) * 100)}
            <span>%</span>
          </div>
          <span>of the season elapsed</span>
          <progress max={total} value={elapsed} />
        </div>
      </section>
      <div className="goals-grid">
        {s.goals.map((g) => {
          const done = g.milestones.filter((m) => m.done).length,
            planned = weekMinutes(s, g.id, today),
            actual = weekMinutes(s, g.id, today, true);
          return (
            <section className={`goal-card ${g.color}`} key={g.id}>
              <div className="label-row">
                <span className="priority">
                  <Flag size={14} />
                  {g.priority === 'core'
                    ? 'Core focus'
                    : g.priority === 'secondary'
                      ? 'Secondary focus'
                      : 'Support area'}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Edit goal ${g.title}`}
                  onClick={() => setEditing(g)}
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>
              <h2>{g.title}</h2>
              <p>{g.why || 'Add your reason for pursuing this goal.'}</p>
              <div className="goal-stats">
                <div>
                  <strong>{hours(planned)}</strong>
                  <span>planned / {hours(g.weeklyMinutes)}</span>
                </div>
                <div>
                  <strong>{hours(actual)}</strong>
                  <span>focused this week</span>
                </div>
              </div>
              <progress
                max={g.weeklyMinutes}
                value={Math.min(planned, g.weeklyMinutes)}
                aria-label={`${g.title} planned weekly time`}
              />
              <div className="label-row milestone-label">
                <span>MILESTONES</span>
                <small>
                  {done} / {g.milestones.length}
                </small>
              </div>
              {g.milestones.map((m) => (
                <button
                  className={`milestone ${m.done ? 'complete' : ''}`}
                  key={m.id}
                  onClick={() => {
                    try {
                      saveGoal({
                        ...g,
                        milestones: g.milestones.map((x) =>
                          x.id === m.id ? { ...x, done: !x.done } : x,
                        ),
                      });
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  <span className="checkbox">{m.done ? <Check size={13} /> : null}</span>
                  <span>{m.title}</span>
                </button>
              ))}
              {!g.milestones.length ? (
                <button className="text-button" onClick={() => setEditing(g)}>
                  <Plus size={14} /> Add your first milestone
                </button>
              ) : null}
            </section>
          );
        })}
        <button className="goal-card add-goal" onClick={() => setEditing(true)}>
          <Plus size={27} />
          <strong>What else matters?</strong>
          <span>Give a meaningful goal a place in this season.</span>
        </button>
      </div>
      {editing ? (
        <GoalEditor
          goal={editing === true ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {editSeason ? (
        <Modal title="Shape your season" onClose={() => setEditSeason(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                commit({
                  ...s,
                  season: {
                    title: String(data.get('title')),
                    start: String(data.get('start')),
                    end: String(data.get('end')),
                  },
                });
                setEditSeason(false);
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label>
              Season name
              <input name="title" required maxLength={300} defaultValue={s.season.title} />
            </label>
            <div className="form-row">
              <label>
                Start
                <input required type="date" name="start" defaultValue={s.season.start} />
              </label>
              <label>
                End
                <input required type="date" name="end" defaultValue={s.season.end} />
              </label>
            </div>
            <div className="modal-actions">
              <span />
              <button className="button primary">Save season</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
