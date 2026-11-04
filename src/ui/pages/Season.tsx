import { useState } from 'react';
import { Plus, ArrowUpRight, Flag, Check } from 'lucide-react';
import { useStore, commit, saveGoal, signCommitment } from '../useWorkspace';
import { hours, localDate, type Goal, type SupportArea } from '../../domain/model';
import { weekMinutes } from '../../domain/planning';
import { GoalEditor } from '../components/Editors';
import { AreaEditor } from '../components/AreaEditor';
import { Modal } from '../components/Modal';
export function Season({ notify }: { notify: (s: string) => void }) {
  const s = useStore();
  const [editing, setEditing] = useState<Goal | true | null>(null),
    [editSeason, setEditSeason] = useState(false),
    [editArea, setEditArea] = useState<SupportArea | true | null>(null),
    [editPromise, setEditPromise] = useState(false);
  const promise = s.onboarding.commitments.at(-1),
    notes = s.onboarding.history.at(-1);
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
      {promise ? (
        <section className="season-commitment">
          <Flag size={21} />
          <div>
            <div className="eyebrow">YOUR SEASON STARTS WITH A PROMISE</div>
            <p>{promise.text}</p>
            <small>
              Signed {promise.signature} ·{' '}
              {new Date(promise.signedAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              · Revision {promise.revision}
            </small>
            <button className="text-button" onClick={() => setEditPromise(true)}>
              Edit and re-sign my commitment
            </button>
            {s.onboarding.commitments.length > 1 ? (
              <details className="commitment-history">
                <summary>Previous commitments</summary>
                {s.onboarding.commitments
                  .slice(0, -1)
                  .reverse()
                  .map((c) => (
                    <article key={c.id}>
                      <p>{c.text}</p>
                      <small>
                        {c.signature} · {new Date(c.signedAt).toLocaleDateString()} · Revision{' '}
                        {c.revision}
                      </small>
                    </article>
                  ))}
              </details>
            ) : null}
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
                      : 'Supporting goal (legacy)'}
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
      <section className="season-areas">
        <div className="label-row">
          <div>
            <h2>Support areas</h2>
            <p className="hint">Ongoing care for the life around your goals.</p>
          </div>
          <button className="button small" onClick={() => setEditArea(true)}>
            <Plus size={15} />
            Add support area
          </button>
        </div>
        <div className="area-grid">
          {s.supportAreas.map((a) => (
            <article key={a.id} className={`area-card ${a.color}`}>
              <div className="label-row">
                <h3>
                  <span className="goal-dot" /> {a.title}
                </h3>
                <button
                  className="icon-button"
                  aria-label={`Edit area ${a.title}`}
                  onClick={() => setEditArea(a)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <p>{a.description || 'An ongoing area of life to keep looking after.'}</p>
            </article>
          ))}
        </div>
        {!s.supportAreas.length ? (
          <p className="empty-small">
            Add an area for ongoing responsibilities, health, or relationships. Areas stay separate
            from seasonal outcomes.
          </p>
        ) : null}
      </section>
      {notes ? (
        <details className="planning-notes">
          <summary>Your planning notes and original answers</summary>
          <p>{notes.brainDump}</p>
          {notes.answers.map((answer) => (
            <div key={answer.questionId}>
              <strong>{answer.prompt}</strong>
              <p>{answer.answer || 'Skipped'}</p>
            </div>
          ))}
        </details>
      ) : null}
      {editArea ? (
        <AreaEditor
          area={editArea === true ? undefined : editArea}
          onClose={() => setEditArea(null)}
        />
      ) : null}
      {editPromise && promise ? (
        <Modal
          title="A commitment worth coming back to"
          description="Edit your words and sign a new revision. Your earlier signed commitments stay in the history."
          onClose={() => setEditPromise(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                signCommitment(String(data.get('commitment')), String(data.get('signature')));
                setEditPromise(false);
                notify('Your new commitment is signed.');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label>
              Your commitment
              <textarea
                aria-label="Your commitment"
                name="commitment"
                required
                maxLength={2000}
                rows={6}
                defaultValue={promise.text}
              />
            </label>
            <label>
              Signed
              <input name="signature" required maxLength={60} defaultValue={promise.signature} />
            </label>
            <div className="modal-actions">
              <span />
              <button className="button primary">Sign new revision</button>
            </div>
          </form>
        </Modal>
      ) : null}
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
