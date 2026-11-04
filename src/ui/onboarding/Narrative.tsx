import type { StepProps } from './types';
import { dateLabel } from './format';
import { Actions } from './Actions';
import { Sparkles, ShieldCheck } from 'lucide-react';
import type { CoachingStatus } from '../../domain/coach';
export function Narrative({
  draft,
  heading,
  next,
  goBack,
  patch,
  end,
  status,
  busy,
}: {
  draft: StepProps['draft'];
  heading: StepProps['heading'];
  next: StepProps['next'];
  goBack: () => void;
  patch: StepProps['patch'];
  end: string;
  status: CoachingStatus;
  busy: boolean;
}) {
  return (
    <form onSubmit={next}>
      <span className="setup-kicker">START WITH THE BIG PICTURE</span>
      <h1 ref={heading} tabIndex={-1}>
        Imagine it’s {dateLabel(end)}.<br />
        What would make you proud?
      </h1>
      <p className="setup-description">
        Projects, habits, ambitions, the way you want your days to feel. Say it in your own words.
        We’ll ask a few questions to find what matters most.
      </p>
      <label className="narrative-label">
        What would you like to achieve or experience?
        <textarea
          autoFocus
          disabled={busy}
          required
          minLength={40}
          maxLength={6000}
          rows={8}
          value={draft.brainDump}
          onChange={(e) => patch({ brainDump: e.target.value })}
          placeholder="I’ve been thinking about…"
        />
      </label>
      <div className="narrative-meta">
        <span>A few honest sentences is a good start.</span>
        <span>{draft.brainDump.length} characters</span>
      </div>
      <fieldset className="coach-choice">
        <legend>How would you like to shape your plan?</legend>
        <label>
          <input
            type="radio"
            checked={draft.coachMode === 'guided'}
            disabled={busy}
            onChange={() => patch({ coachMode: 'guided' })}
          />
          <span>
            <strong>
              <ShieldCheck size={15} /> Private guided mode
            </strong>
            <small>Topic-based questions and an editable outline. Runs on this device.</small>
          </span>
        </label>
        <label className={!status.configured ? 'unavailable' : ''}>
          <input
            type="radio"
            checked={draft.coachMode === 'connected'}
            disabled={!status.configured || busy}
            onChange={() => patch({ coachMode: 'connected' })}
          />
          <span>
            <strong>
              <Sparkles size={15} /> Connected AI coach
            </strong>
            <small>
              {status.configured
                ? `Sends this narrative and your answers to ${status.provider} when you continue.`
                : 'Connect your own AI provider on the server to enable personal follow-ups and plan drafting.'}
            </small>
          </span>
        </label>
      </fieldset>
      <Actions
        onBack={goBack}
        nextLabel={busy ? 'Preparing your questions…' : 'Shape my goals'}
        disabled={busy}
      />
    </form>
  );
}
