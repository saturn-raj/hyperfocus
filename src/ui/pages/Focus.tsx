import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Headphones, Shield, Check, Timer, Volume2 } from 'lucide-react';
import {
  useStore,
  startFocus,
  toggleTimer,
  finishFocus,
  discardFocus,
  updateSettings,
} from '../useWorkspace';
import { remaining } from '../../domain/planning';
import { hours } from '../../domain/model';
import { GoalSelect, type WorkTarget } from '../components/Editors';
import { Modal } from '../components/Modal';
export function Focus({ notify }: { notify: (s: string) => void }) {
  const s = useStore();
  const [now, setNow] = useState(Date.now),
    [title, setTitle] = useState(''),
    [duration, setDuration] = useState(25),
    [target, setTarget] = useState<WorkTarget>({ goalId: s.goals[0]?.id ?? null, areaId: null }),
    [taskId, setTaskId] = useState<string | null>(null),
    [quality, setQuality] = useState(4),
    [review, setReview] = useState(false),
    [noise, setNoise] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const seconds = s.timer ? remaining(s.timer, now) : duration * 60;
  const display = `${String(Math.ceil(seconds / 60) - (Math.ceil(seconds) % 60 === 0 ? 0 : 1)).padStart(2, '0')}:${String(Math.ceil(seconds) % 60).padStart(2, '0')}`;
  useEffect(() => {
    if (!s.timer) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [s.timer]);
  useEffect(() => {
    document.title = s.timer
      ? `${display} · ${s.timer.title} · Hyperfocus`
      : 'Hyperfocus · Make room for what matters';
    return () => {
      document.title = 'Hyperfocus · Make room for what matters';
    };
  }, [display, s.timer]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  async function toggleNoise() {
    if (noise) {
      await audio.current?.close();
      audio.current = null;
      setNoise(false);
      return;
    }
    try {
      const ctx = new AudioContext();
      audio.current = ctx;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < channel.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        channel[i] = last * 3;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      source.connect(gain).connect(ctx.destination);
      source.start();
      await ctx.resume();
      setNoise(true);
    } catch {
      notify('Your browser could not start audio.');
    }
  }
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
          <div className="eyebrow">ONE THING AT A TIME</div>
          <h1>Find your focus.</h1>
          <p>Close the extra tabs. Take a breath. Begin where you are.</p>
        </div>
      </div>
      <div className="focus-layout">
        <section className="focus-main">
          <div className="focus-kicker">
            <span className={`status-dot ${s.timer?.runningSince ? '' : 'paused'}`} />
            {s.timer
              ? seconds === 0
                ? 'Session complete'
                : s.timer.runningSince
                  ? 'Focus in progress'
                  : 'Taking a breather'
              : 'A little space for deep work'}
          </div>
          {s.timer ? (
            <>
              <h2>{s.timer.title}</h2>
              {s.timer.areaId ? (
                <p className="muted">
                  {s.supportAreas.find((area) => area.id === s.timer?.areaId)?.title}
                </p>
              ) : null}
            </>
          ) : (
            <h2>What deserves your attention?</h2>
          )}
          <div
            className={`timer-dial ${s.timer ? 'running' : ''}`}
            style={
              {
                '--progress': `${s.timer ? 100 - (seconds / s.timer.durationSeconds) * 100 : 0}%`,
              } as React.CSSProperties
            }
          >
            <div>
              <span className="timer-digits" role="timer" aria-label={`${display} remaining`}>
                {display}
              </span>
              <span className="timer-caption">
                {seconds === 0 ? 'WELL DONE. TAKE A BREATH.' : 'MINUTES OF POSSIBILITY'}
              </span>
            </div>
          </div>
          {s.timer ? (
            <div className="focus-controls">
              {seconds > 0 ? (
                <button className="button primary" onClick={() => run(toggleTimer)}>
                  {s.timer.runningSince ? <Pause size={17} /> : <Play size={17} />}{' '}
                  {s.timer.runningSince ? 'Pause' : 'Resume'}
                </button>
              ) : null}
              <button className="button" onClick={() => setReview(true)}>
                <Check size={17} /> Finish & reflect
              </button>
              <button
                className="text-button muted"
                onClick={() => {
                  if (confirm('Discard this session without saving focus time?')) run(discardFocus);
                }}
              >
                Discard
              </button>
            </div>
          ) : (
            <form
              className="focus-form"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => startFocus(title.trim(), duration, target.goalId, taskId, target.areaId));
              }}
            >
              <label>
                Choose a next action
                <select
                  aria-label="Choose a next action"
                  value={taskId ?? ''}
                  onChange={(e) => {
                    const task = s.tasks.find((t) => t.id === e.target.value);
                    setTaskId(task?.id ?? null);
                    setTitle(task?.title ?? '');
                    if (task) {
                      setDuration(task.duration);
                      setTarget({ goalId: task.goalId, areaId: task.areaId ?? null });
                    }
                  }}
                >
                  <option value="">Something else…</option>
                  {s.tasks
                    .filter((t) => !t.done)
                    .map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Session intention
                <input
                  required
                  maxLength={300}
                  value={title}
                  placeholder="One thing I want to move forward"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <div className="form-row">
                <GoalSelect
                  value={target.goalId}
                  areaId={target.areaId}
                  onTargetChange={(selection) => {
                    setTarget(selection);
                    setTaskId(null);
                  }}
                />
                <label>
                  Minutes
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </label>
              </div>
              <button className="button primary start-focus">
                <Play size={17} /> Start focusing
              </button>
            </form>
          )}
          <p className="focus-footnote">
            {s.timer
              ? 'The timer survives reloads. Pausing stops the clock.'
              : 'Progress begins with showing up, even for 25 minutes.'}
          </p>
        </section>
        <aside className="focus-side">
          <section className="surface">
            <div className="label-row">
              <Headphones size={20} />
              <button
                className={`button small ${noise ? 'primary' : ''}`}
                onClick={() => void toggleNoise()}
              >
                {noise ? 'Playing' : 'Play'}
              </button>
            </div>
            <h3>A softer background</h3>
            <p>Gentle, generated brown noise. No streams, ads, or tracking.</p>
            <button
              className="text-button"
              onClick={() => run(() => updateSettings({ sound: !s.settings.sound }))}
            >
              <Volume2 size={15} />
              {s.settings.sound ? 'Sound enabled' : 'Enable completion sound'}
            </button>
            <CompletionSound seconds={seconds} enabled={s.settings.sound} active={!!s.timer} />
          </section>
          <section className="surface">
            <Shield size={22} />
            <h3>Protect your attention</h3>
            <p>The optional Chrome extension blocks your chosen websites during active sessions.</p>
            <a
              className="text-button"
              href="https://github.com/saturn-raj/hyperfocus/tree/main/extension"
              target="_blank"
              rel="noreferrer"
            >
              Install the companion ↗
            </a>
            <small>
              Install it manually in Chrome. Blocking needs the planner tab open; native apps are
              outside its scope.
            </small>
          </section>
          <section className="surface">
            <Timer size={21} />
            <h3>Your recent focus</h3>
            {s.sessions
              .slice(-4)
              .reverse()
              .map((session) => (
                <div className="recent-session" key={session.id}>
                  <span>
                    {session.title}
                    {session.areaId ? (
                      <small>
                        {' '}
                        ·{' '}
                        {s.supportAreas.find((area) => area.id === session.areaId)?.title ??
                          'Support area'}
                      </small>
                    ) : null}
                  </span>
                  <strong>{hours(session.minutes)}</strong>
                </div>
              ))}
            {!s.sessions.length ? (
              <p>Your first session will appear here. Make it a small one.</p>
            ) : null}
          </section>
        </aside>
      </div>
      {review ? (
        <Modal
          title="A moment to check in"
          description="Focused time is saved separately from task completion. You decide when the work is done."
          onClose={() => setReview(false)}
        >
          <label>
            How did your focus feel?
            <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
              <option value="1">1 · Very distracted</option>
              <option value="2">2 · A little scattered</option>
              <option value="3">3 · Steady enough</option>
              <option value="4">4 · Good focus</option>
              <option value="5">5 · Fully absorbed</option>
            </select>
          </label>
          <div className="modal-actions">
            <span />
            <button
              className="button primary"
              onClick={() =>
                run(() => {
                  finishFocus(quality);
                  setReview(false);
                  notify('Focus saved. A small step counts.');
                })
              }
            >
              Save session
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
function CompletionSound({
  seconds,
  enabled,
  active,
}: {
  seconds: number;
  enabled: boolean;
  active: boolean;
}) {
  const rang = useRef(false);
  useEffect(() => {
    if (seconds > 0) rang.current = false;
    if (!active || !enabled || seconds > 0 || rang.current) return;
    rang.current = true;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 1);
    oscillator.onended = () => {
      void ctx.close();
    };
  }, [seconds, enabled, active]);
  return null;
}
