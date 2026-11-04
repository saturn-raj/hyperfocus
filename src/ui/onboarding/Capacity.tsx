import type { StepProps } from './types';
import { hours } from '../../domain/model';
import { Actions } from './Actions';

export function Capacity({
  draft,
  heading,
  next,
  patch,
  goalPatch,
  total,
  goBack,
}: Pick<StepProps, 'draft' | 'heading' | 'next' | 'patch' | 'goalPatch' | 'total' | 'goBack'>) {
  return (
    <form onSubmit={next}>
      <span className="onboarding-eyebrow">AMBITION, MEET REAL LIFE</span>
      <h1 ref={heading} tabIndex={-1}>
        What can you
        <br />
        <em>make room for?</em>
      </h1>
      <p className="onboarding-description">
        After work, sleep, commitments, and time to do nothing: how much time can you comfortably
        give these goals each week?
      </p>
      <label className="capacity-input">
        Available hours each week
        <div>
          <input
            aria-label="Available hours each week"
            type="number"
            min={0.5}
            max={40}
            step={0.5}
            value={draft.weeklyCapacity / 60}
            onChange={(e) => {
              const minutes = Number(e.target.value) * 60;
              if (minutes >= 30 && minutes <= 2400 && Number.isInteger(minutes))
                patch({ weeklyCapacity: minutes });
            }}
          />
          <span>hours / week</span>
        </div>
      </label>
      <div className="capacity-goals">
        {draft.goals.map((g) => (
          <label key={g.id}>
            <span>
              <span className={`goal-dot ${g.color}`} />
              <strong>{g.title}</strong>
              <small>
                {g.priority === 'core'
                  ? 'Core focus'
                  : g.priority === 'secondary'
                    ? 'Secondary focus'
                    : 'Support area'}
              </small>
            </span>
            <div>
              <input
                aria-label={`Weekly hours for ${g.title}`}
                type="number"
                min={0.5}
                max={40}
                step={0.5}
                value={g.weeklyMinutes / 60}
                onChange={(e) => {
                  const minutes = Number(e.target.value) * 60;
                  if (minutes >= 30 && minutes <= 2400 && Number.isInteger(minutes))
                    goalPatch(g.id, { weeklyMinutes: minutes });
                }}
              />
              <span>h</span>
            </div>
          </label>
        ))}
      </div>
      <div
        className={`capacity-summary ${total > draft.weeklyCapacity ? 'over-budget' : ''}`}
        role="status"
      >
        <strong>
          {hours(total)} committed <span>/ {hours(draft.weeklyCapacity)} available</span>
        </strong>
        <p>
          {total > draft.weeklyCapacity
            ? `${hours(total - draft.weeklyCapacity)} over your capacity. Let’s give one of these goals a smaller slice.`
            : total === draft.weeklyCapacity
              ? 'Every hour has a job. Consider leaving some breathing room.'
              : `${hours(draft.weeklyCapacity - total)} of breathing room for the weeks that don’t go to plan.`}
        </p>
      </div>
      <Actions onBack={goBack} nextLabel="See my season" />
    </form>
  );
}
