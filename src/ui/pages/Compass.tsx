import { useState } from 'react';
import { Sparkles, ArrowUpRight, BookOpen, Check } from 'lucide-react';
import { useStore, addReflection } from '../useWorkspace';
import { addDays, hours, localDate } from '../../domain/model';
import { recommendations } from '../../domain/planning';
import { Modal } from '../components/Modal';
export function Compass({ notify, onPlan }: { notify: (s: string) => void; onPlan: () => void }) {
  const s = useStore(),
    today = localDate();
  const [review, setReview] = useState(false);
  const reflection = s.reflections.find((r) => r.date === today);
  const [win, setWin] = useState(reflection?.win ?? ''),
    [improve, setImprove] = useState(reflection?.improve ?? ''),
    [energy, setEnergy] = useState(reflection?.energy ?? 3);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const daily = dates.map((date) => ({
    date,
    minutes: s.sessions
      .filter((x) => localDate(new Date(x.endedAt)) === date)
      .reduce((sum, x) => sum + x.minutes, 0),
  }));
  const total = daily.reduce((a, b) => a + b.minutes, 0),
    max = Math.max(60, ...daily.map((d) => d.minutes));
  const recent = s.sessions.filter(
    (x) => localDate(new Date(x.endedAt)) >= dates[0] && localDate(new Date(x.endedAt)) <= today,
  );
  const quality = recent.length
    ? (recent.reduce((sum, x) => sum + x.quality, 0) / recent.length).toFixed(1)
    : '–';
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">NOTICE. ADJUST. KEEP GOING.</div>
          <h1>Your compass.</h1>
          <p>An honest look at where your time went, and where to go next.</p>
        </div>
        <button className="button primary" onClick={() => setReview(true)}>
          <BookOpen size={16} />
          {reflection ? 'Edit today’s reflection' : 'Reflect on today'}
        </button>
      </div>
      <div className="stats-row">
        <div>
          <span>Focused, last 7 days</span>
          <strong>{hours(total)}</strong>
          <small>Time you actively spent in focus</small>
        </div>
        <div>
          <span>Focus quality</span>
          <strong>
            {quality}
            <em> / 5</em>
          </strong>
          <small>Your average session rating</small>
        </div>
        <div>
          <span>Small steps taken</span>
          <strong>{recent.length}</strong>
          <small>Focus sessions in the last 7 days</small>
        </div>
      </div>
      <div className="compass-layout">
        <section className="surface focus-chart">
          <div className="label-row">
            <h2>A little progress, every day</h2>
            <span className="muted">Last 7 days</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={daily
              .map((d) => `${d.date}: ${Math.round(d.minutes)} focused minutes`)
              .join('; ')}
          >
            {daily.map((d) => (
              <div className={`bar-column ${d.date === today ? 'today' : ''}`} key={d.date}>
                <span>{d.minutes ? hours(d.minutes) : '0m'}</span>
                <div className="bar-track">
                  <div
                    style={{
                      height: `${Math.max(d.minutes > 0 ? 2 : 0, (d.minutes / max) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                  })}
                </small>
              </div>
            ))}
          </div>
          {total === 0 ? (
            <p className="hint">No recorded focus yet. Your first session starts the picture.</p>
          ) : null}
        </section>
        <section className="surface">
          <Sparkles size={23} className="accent-text" />
          <h2>Keep the plan honest.</h2>
          <p>
            These suggestions compare scheduled time with the targets you chose. They are local
            rules, not an AI assessment of your chances.
          </p>
          <div className="recommendations">
            {recommendations(s, today).map((r) => (
              <div key={r.goal.id}>
                <div className="label-row">
                  <strong>{r.goal.title}</strong>
                  <span className={`tag ${r.gap ? 'orange' : 'green'}`}>
                    {r.gap ? 'Needs time' : 'Time protected'}
                  </span>
                </div>
                <p>
                  {r.gap
                    ? `Make room for ${hours(r.gap)} more to meet your weekly target.`
                    : `You’ve scheduled ${hours(r.planned)} of your ${hours(r.goal.weeklyMinutes)} target.`}
                </p>
                <small>{hours(r.actual)} focused this week</small>
              </div>
            ))}
          </div>
          <button className="text-button" onClick={onPlan}>
            Return to your plan <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
      <section className="reflections">
        <h2>Notes to your future self</h2>
        {s.reflections.length ? (
          <div className="reflection-list">
            {[...s.reflections]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <article className="surface" key={r.id}>
                  <div className="label-row">
                    <span>
                      {new Date(`${r.date}T12:00:00`).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="muted">Energy {r.energy}/5</span>
                  </div>
                  <h3>What moved forward</h3>
                  <p>{r.win}</p>
                  {r.improve ? (
                    <>
                      <h3>What I’ll try next</h3>
                      <p>{r.improve}</p>
                    </>
                  ) : null}
                </article>
              ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={28} />
            <h3>Your experience is useful data.</h3>
            <p>Capture a win and one thing to try differently tomorrow.</p>
            <button className="button" onClick={() => setReview(true)}>
              Write a reflection
            </button>
          </div>
        )}
      </section>
      {review ? (
        <Modal
          title="How did today feel?"
          description="One win. One lesson. Enough to make tomorrow a little better."
          onClose={() => setReview(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                addReflection(win.trim(), improve.trim(), energy);
                setReview(false);
                notify('Reflection saved.');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label>
              What moved forward?
              <textarea
                autoFocus
                required
                maxLength={4000}
                value={win}
                onChange={(e) => setWin(e.target.value)}
                placeholder="A small win is still a win."
              />
            </label>
            <label>
              What would you like to try differently?
              <textarea
                maxLength={4000}
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
              />
            </label>
            <label>
              Energy level
              <select value={energy} onChange={(e) => setEnergy(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} · {['Drained', 'Low', 'Steady', 'Good', 'Energized'][n - 1]}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <span />
              <button className="button primary">
                <Check size={16} /> Save reflection
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
