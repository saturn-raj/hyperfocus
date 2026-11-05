import { useRef, useState } from 'react';
import { guidedAnswerChoices } from '../../domain/answer-choices';
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
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
  const [customFor, setCustomFor] = useState<string | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const question = draft.questions[draft.questionIndex];
  const answer = draft.answers.find((a) => a.questionId === question?.id)?.answer ?? '';
  // Old saved guided questions gain choices at render time, without rewriting any answers.
  const options = question?.options?.length
    ? question.options
    : draft.coachMode === 'guided' && question
      ? guidedAnswerChoices(question.id, draft.brainDump)
      : [];
  const multiple = draft.coachMode === 'guided' && question?.id === 'support';
  const selected = multiple ? answer.split('\n').filter(Boolean) : answer ? [answer] : [];
  const pureChoice = selected.length > 0 && selected.every((value) => options.includes(value));
  const showCustom = !options.length || customFor === question?.id || (!!answer && !pureChoice);
  function select(option: string) {
    onAnswer(
      multiple
        ? (selected.includes(option)
            ? selected.filter((value) => value !== option)
            : [...selected, option]
          ).join('\n')
        : option,
    );
  }
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
      {options.length ? (
        <div className="answer-choice-section">
          <p className="answer-choice-hint">
            {multiple
              ? 'Choose any that matter, or add your own.'
              : 'Choose one, or write your own answer.'}
          </p>
          <div
            className={`answer-options ${multiple ? 'multiple' : ''}`}
            role="group"
            aria-label="Suggested answers"
          >
            {options.map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={selected.includes(option)}
                className={selected.includes(option) ? 'selected' : ''}
                disabled={busy}
                onClick={() => select(option)}
              >
                <span className="choice-indicator" aria-hidden="true">
                  {selected.includes(option) ? <Check size={14} /> : null}
                </span>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`custom-answer-toggle ${showCustom ? 'active' : ''}`}
            disabled={busy}
            onClick={() => {
              setCustomFor(question.id);
              requestAnimationFrame(() => textInput.current?.focus());
            }}
          >
            <Pencil size={15} />
            {pureChoice ? 'Add detail or write my own' : 'Write my own answer'}
          </button>
        </div>
      ) : null}
      {showCustom ? (
        <label className="answer-label">
          Your answer
          <textarea
            ref={textInput}
            aria-label="Your answer"
            key={question.id}
            autoFocus
            rows={options.length ? 3 : 5}
            maxLength={6000}
            disabled={busy}
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Here’s what matters to me…"
          />
        </label>
      ) : null}
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
