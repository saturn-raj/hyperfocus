import type { StepProps } from './types';
import { Flag, CheckCircle2 } from 'lucide-react';
import { Actions } from './Actions';
import { dateLabel } from './format';

export function SeasonSetup({
  draft,
  heading,
  next,
  patch,
  end,
  goBack,
}: Pick<StepProps, 'draft' | 'heading' | 'next' | 'patch' | 'end' | 'goBack'>) {
  return (
    <form onSubmit={next}>
      <span className="onboarding-eyebrow">A FRESH START</span>
      <h1 ref={heading} tabIndex={-1}>
        Let’s give the next chapter
        <br />a little direction.
      </h1>
      <p className="onboarding-description">
        Start with your name and a window of time. Twelve weeks is a good place to begin.
      </p>
      <label className="onboarding-label">
        What should we call you?
        <input
          required
          autoComplete="given-name"
          maxLength={60}
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Your first name"
        />
      </label>
      <fieldset className="season-length-fieldset">
        <legend>How long would you like this season to be?</legend>
        <div className="season-length-options">
          {[
            { days: 84, title: '12 weeks', note: 'Room to make real progress' },
            { days: 42, title: '6 weeks', note: 'A shorter, focused sprint' },
            { days: 28, title: '4 weeks', note: 'Start small and find your rhythm' },
          ].map((option) => (
            <button
              key={option.days}
              type="button"
              aria-pressed={draft.lengthDays === option.days}
              className={draft.lengthDays === option.days ? 'selected' : ''}
              onClick={() => patch({ lengthDays: option.days })}
            >
              <strong>{option.title}</strong>
              <span>{option.note}</span>
              {draft.lengthDays === option.days ? <CheckCircle2 size={17} /> : null}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-row">
        <label>
          Season starts
          <input
            required
            type="date"
            value={draft.start}
            onChange={(e) => {
              if (e.target.value) patch({ start: e.target.value });
            }}
          />
        </label>
        <label>
          Days (customize if you like)
          <input
            required
            type="number"
            min={7}
            max={366}
            value={draft.lengthDays}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 7 && value <= 366) patch({ lengthDays: value });
            }}
          />
        </label>
      </div>
      <div className="onboarding-date-note">
        <Flag size={15} />
        <span>
          A season from {dateLabel(draft.start)} to {dateLabel(end)}.
        </span>
      </div>
      <Actions onBack={goBack} nextLabel="Make some space" />
    </form>
  );
}
