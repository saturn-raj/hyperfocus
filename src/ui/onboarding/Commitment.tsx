import type { StepProps } from './types';
import { Flag, CheckCircle2 } from 'lucide-react';
import { Actions } from './Actions';
import { dateLabel } from './format';
import { localDate } from '../../domain/model';

export function Commitment({
  draft,
  heading,
  finish,
  patch,
  goBack,
}: Pick<StepProps, 'draft' | 'heading' | 'finish' | 'patch' | 'goBack'>) {
  return (
    <form onSubmit={finish}>
      <span className="onboarding-eyebrow">A PROMISE TO YOURSELF</span>
      <h1 ref={heading} tabIndex={-1}>
        You don’t have to do it all.
        <br />
        <em>Just what matters.</em>
      </h1>
      <p className="onboarding-description">
        You’ve made space for a few things that count. Put that intention into words you’ll want to
        come back to.
      </p>
      <div className="commitment-paper">
        <div className="commitment-paper-heading">
          <Flag size={18} />
          <span>MY SEASON · {draft.lengthDays} DAYS</span>
        </div>
        <label>
          Your commitment
          <textarea
            required
            rows={5}
            maxLength={2000}
            value={draft.commitment}
            onChange={(e) => patch({ commitment: e.target.value })}
          />
        </label>
        <div className="commitment-signature">
          <label>
            Signed
            <input
              required
              maxLength={60}
              value={draft.signature}
              onChange={(e) => patch({ signature: e.target.value })}
              placeholder={draft.name || 'Your name'}
            />
          </label>
          <span>{dateLabel(localDate())}</span>
        </div>
      </div>
      <div className="onboarding-after">
        <CheckCircle2 size={18} />
        <p>
          Your goals, milestones, and first actions will be ready in your season. A weekly
          reflection will help you keep the plan honest.
        </p>
      </div>
      <Actions onBack={goBack} nextLabel="Begin my season" />
    </form>
  );
}
