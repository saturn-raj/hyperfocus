import type { StepProps } from './types';
import { Plus } from 'lucide-react';
import { Actions } from './Actions';
import { dateLabel } from './format';

export function BrainDump({
  draft,
  heading,
  next,
  patch,
  end,
  setSuggestion,
  suggestion,
  goBack,
}: Pick<
  StepProps,
  'draft' | 'heading' | 'next' | 'patch' | 'end' | 'setSuggestion' | 'suggestion' | 'goBack'
>) {
  return (
    <form onSubmit={next}>
      <span className="onboarding-eyebrow">LET IT ALL OUT</span>
      <h1 ref={heading} tabIndex={-1}>
        Imagine it’s {dateLabel(end)}.<br />
        What would you be glad you did?
      </h1>
      <p className="onboarding-description">
        The project. The habit. The thing you keep saying “someday” about. Give each idea its own
        line. We’ll choose what comes first next.
      </p>
      <label className="onboarding-label">
        What would you like to achieve or experience?
        <textarea
          className="brain-dump-input"
          autoFocus
          rows={7}
          maxLength={6000}
          value={draft.brainDump}
          onChange={(e) => patch({ brainDump: e.target.value })}
          placeholder={
            'Launch the project I keep thinking about\nBuild a consistent exercise habit\nMake more time to read'
          }
        />
      </label>
      <div className="brain-dump-footer">
        <span>One goal per line · Up to 5 goals</span>
        <span>{draft.brainDump.split('\n').filter((t) => t.trim()).length} / 5</span>
      </div>
      <div className="brain-dump-prompts">
        <span>Need a starting point?</span>
        {[
          'Something to build',
          'Something to learn',
          'Something for my health',
          'Something for my relationships',
        ].map((t) => (
          <button type="button" key={t} onClick={() => setSuggestion(t)}>
            {t} <Plus size={12} />
          </button>
        ))}
      </div>
      {suggestion ? (
        <p className="onboarding-prompt" role="status">
          {suggestion === 'Something to build'
            ? 'What would you like to have made or shared by the end of this season?'
            : suggestion === 'Something to learn'
              ? 'What skill or subject would make your days more interesting?'
              : suggestion === 'Something for my health'
                ? 'What small, repeatable habit would help you feel more like yourself?'
                : 'Who would you like to spend more intentional time with, and how?'}
        </p>
      ) : null}
      <Actions onBack={goBack} nextLabel="Find the direction" />
    </form>
  );
}
