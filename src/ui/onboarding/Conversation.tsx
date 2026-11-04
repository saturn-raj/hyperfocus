import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { OnboardingDraft } from '../../domain/model';
import type { FormEvent, RefObject } from 'react';
export function Conversation({
  draft,
  heading,
  onAnswer,
  onNext,
  onBack,
  onSkip,
  busy,
}: {
  draft: OnboardingDraft;
  heading: RefObject<HTMLHeadingElement | null>;
  onAnswer: (text: string) => void;
  onNext: (event: FormEvent) => void;
  onBack: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const question = draft.questions[draft.questionIndex];
  const answer = draft.answers.find((a) => a.questionId === question?.id)?.answer ?? '';
  if (!question) return <p role="status">Preparing your questions…</p>;
  return (
    <form onSubmit={onNext}>
      <div className="conversation-meta">
        <span className="setup-kicker">A FEW QUESTIONS, JUST FOR YOUR SEASON</span>
        <span>
          {draft.questionIndex + 1} of {draft.questions.length}
        </span>
      </div>
      <div
        className="question-track"
        aria-label={`Question ${draft.questionIndex + 1} of ${draft.questions.length}`}
      >
        {draft.questions.map((q, i) => (
          <span
            key={q.id}
            className={
              i < draft.questionIndex ? 'answered' : i === draft.questionIndex ? 'current' : ''
            }
          >
            {i < draft.questionIndex ? <Check size={10} /> : null}
          </span>
        ))}
      </div>
      <h1 ref={heading} tabIndex={-1}>
        {question.prompt}
      </h1>
      <p className="setup-description">
        There’s no perfect answer. A little context helps make the plan feel like yours.
      </p>
      {question.options ? (
        <div className="answer-options">
          {question.options.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={answer === option}
              className={answer === option ? 'selected' : ''}
              disabled={busy}
              onClick={() => onAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      <label className="answer-label">
        Your answer
        <textarea
          aria-label="Your answer"
          key={question.id}
          autoFocus
          rows={5}
          maxLength={6000}
          disabled={busy}
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Here’s what matters to me…"
        />
      </label>
      <div className="conversation-actions">
        <button type="button" className="text-button muted" onClick={onBack} disabled={busy}>
          <ArrowLeft size={15} /> Back
        </button>
        <button type="button" className="text-button muted" onClick={onSkip} disabled={busy}>
          Skip this question
        </button>
        <button className="button primary" disabled={busy}>
          {busy
            ? 'Drafting your plan…'
            : draft.questionIndex === draft.questions.length - 1
              ? 'Draft my season'
              : 'Continue'}
          <ArrowRight size={16} />
        </button>
      </div>
      <details className="answer-history">
        <summary>Your story so far</summary>
        <p>{draft.brainDump}</p>
        {draft.answers
          .filter((a) => a.questionId !== question.id)
          .map((a) => (
            <div key={a.questionId}>
              <strong>{a.prompt}</strong>
              <p>{a.answer || 'Skipped'}</p>
            </div>
          ))}
      </details>
    </form>
  );
}
