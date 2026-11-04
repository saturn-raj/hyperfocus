import type { StepProps } from './types';
import { ArrowRight, ShieldCheck, Target } from 'lucide-react';
import { clock, hours } from '../../domain/model';
import { Actions } from './Actions';
import { dateLabel } from './format';

export function Review({
  draft,
  heading,
  next,
  patch,
  end,
  total,
  core,
  goBack,
}: Pick<StepProps, 'draft' | 'heading' | 'next' | 'patch' | 'end' | 'total' | 'core' | 'goBack'>) {
  return (
    <form onSubmit={next}>
      <span className="onboarding-eyebrow">YOU HAVE A DIRECTION</span>
      <h1 ref={heading} tabIndex={-1}>
        This is your season,
        <br />
        <em>{draft.name}.</em>
      </h1>
      <p className="onboarding-description">
        {dateLabel(draft.start)} – {dateLabel(end)}. {draft.goals.length} meaningful{' '}
        {draft.goals.length === 1 ? 'goal' : 'goals'}. {hours(total)} each week to move them
        forward.
      </p>
      <label>
        Give this season a name
        <input
          value={draft.seasonTitle}
          maxLength={300}
          onChange={(e) => patch({ seasonTitle: e.target.value })}
          placeholder={`${draft.name}’s season of progress`}
        />
      </label>
      <div className="onboarding-plan-goals">
        {draft.goals.map((g) => (
          <article key={g.id} className={g.color}>
            <div>
              <span className="goal-dot" />
              <span>
                {g.priority === 'core'
                  ? 'CORE FOCUS'
                  : g.priority === 'secondary'
                    ? 'SECONDARY FOCUS'
                    : 'SUPPORT AREA'}
              </span>
              <strong>{hours(g.weeklyMinutes)}/week</strong>
            </div>
            <h2>{g.title}</h2>
            <p>{g.why}</p>
            <div className="onboarding-plan-line">
              <Target size={15} />
              <span>{g.success}</span>
            </div>
            <div className="onboarding-plan-line">
              <ArrowRight size={15} />
              <span>
                First: {g.firstAction} · {hours(g.firstDuration)}
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className="onboarding-first-block">
        <label className="onboarding-check">
          <input
            type="checkbox"
            checked={!!draft.firstBlock}
            onChange={(e) =>
              patch({
                firstBlock: e.target.checked ? { date: draft.start, start: 540 } : null,
              })
            }
          />
          <span>Protect time for my first action</span>
        </label>
        <p>Give “{core?.firstAction}” a place in your calendar. You can change it later.</p>
        {draft.firstBlock ? (
          <div className="form-row">
            <label>
              Date
              <input
                type="date"
                required
                min={draft.start}
                max={end}
                value={draft.firstBlock.date}
                onChange={(e) => {
                  if (e.target.value && draft.firstBlock)
                    patch({
                      firstBlock: { ...draft.firstBlock, date: e.target.value },
                    });
                }}
              />
            </label>
            <label>
              Start time
              <input
                type="time"
                required
                value={clock(draft.firstBlock.start)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  if (draft.firstBlock && Number.isFinite(h) && Number.isFinite(m))
                    patch({ firstBlock: { ...draft.firstBlock, start: h * 60 + m } });
                }}
              />
            </label>
          </div>
        ) : null}
      </div>
      <p className="onboarding-local-note">
        <ShieldCheck size={14} />
        You wrote these goals. Hyperfocus organised them locally. Nothing was sent to an AI service.
      </p>
      <Actions onBack={goBack} nextLabel="Make a commitment" />
    </form>
  );
}
