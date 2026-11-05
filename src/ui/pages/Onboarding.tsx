import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Compass,
  CalendarDays,
  Focus,
  X,
} from 'lucide-react';
import {
  useStore,
  saveOnboardingDraft,
  completeOnboarding,
  cancelOnboarding,
  replaceState,
  planning,
} from '../useWorkspace';
import { createState } from '../../domain/seed';
import { addDays, uid, onboardingDraftSchema, type OnboardingDraft } from '../../domain/model';
import { createOnboardingDraft, validateOnboardingStep } from '../../domain/onboarding';
import type { CoachingStatus } from '../../domain/coach';
import { SeasonSetup } from '../onboarding/SeasonSetup';
import { Narrative } from '../onboarding/Narrative';
import { Conversation } from '../onboarding/Conversation';
import { PlanReview } from '../onboarding/PlanReview';
import { Commitment } from '../onboarding/Commitment';
import '../onboarding/styles.css';
const chapters = [
  'A little clarity',
  'Your season',
  'Your story',
  'A few questions',
  'Your plan',
  'Your commitment',
];
function resume(
  draft: OnboardingDraft | null,
  state: ReturnType<typeof useStore>,
): OnboardingDraft {
  if (!draft) return createOnboardingDraft(state);
  if (draft.revisionId === 'legacy')
    return onboardingDraftSchema.parse({
      ...draft,
      revisionId: uid(),
      step: Math.min(draft.step, 2),
    });
  return draft;
}
export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const state = useStore();
  const [draft, setDraft] = useState(() => resume(state.onboarding.draft, state)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [status, setStatus] = useState<CoachingStatus>({ configured: false, provider: null });
  const heading = useRef<HTMLHeadingElement>(null),
    request = useRef<AbortController | null>(null),
    requestId = useRef(0);
  useEffect(() => {
    let live = true;
    void planning.status().then((next) => {
      if (live) setStatus(next);
    });
    return () => {
      live = false;
      request.current?.abort();
    };
  }, []);
  function persist(next: OnboardingDraft) {
    try {
      saveOnboardingDraft(next);
      setDraft(next);
      setError('');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function move(next: OnboardingDraft) {
    if (persist(next)) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(() => heading.current?.focus());
    }
  }
  function patch(changes: Partial<OnboardingDraft>) {
    const planChanged = changes.goals !== undefined || changes.proposedSupportAreas !== undefined;
    const narrativeChanged =
      changes.brainDump !== undefined && changes.brainDump !== draft.brainDump;
    const modeChanged = changes.coachMode !== undefined && changes.coachMode !== draft.coachMode;
    persist({
      ...draft,
      ...changes,
      ...(planChanged ? { revisionId: uid(), commitment: '', signature: '' } : {}),
      ...(narrativeChanged || modeChanged
        ? {
            revisionId: uid(),
            questions: [],
            questionIndex: 0,
            proposalGenerated: false,
            commitment: '',
            signature: '',
          }
        : {}),
    });
  }
  async function generate(kind: 'questions' | 'proposal' | 'commitment', input = draft) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const token = ++requestId.current;
    setBusy(kind);
    setError('');
    try {
      const next = await planning.forMode(input.coachMode)[kind](input, controller.signal);
      if (controller.signal.aborted || token !== requestId.current) return;
      move(next);
    } catch (e) {
      if (!controller.signal.aborted && token === requestId.current)
        setError(
          e instanceof Error
            ? e.message
            : 'The coach could not finish this step. Your answers are saved.',
        );
    } finally {
      if (token === requestId.current) setBusy('');
    }
  }
  function next(e?: FormEvent) {
    e?.preventDefault();
    const problem = validateOnboardingStep(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (draft.step === 2) {
      if (draft.questions.length) move({ ...draft, step: 3 });
      else void generate('questions');
      return;
    }
    if (draft.step === 4) {
      if (draft.commitment.trim()) move({ ...draft, step: 5 });
      else void generate('commitment');
      return;
    }
    move({ ...draft, step: draft.step + 1 });
  }
  function answer(text: string) {
    const question = draft.questions[draft.questionIndex];
    if (!question) return;
    const existing = draft.answers.find((a) => a.questionId === question.id);
    const capacity = question.id === 'capacity' ? /^About (\d+) hours a week$/.exec(text) : null;
    persist({
      ...draft,
      ...(capacity ? { weeklyCapacity: Number(capacity[1]) * 60 } : {}),
      answers: [
        ...draft.answers.filter((a) => a.questionId !== question.id),
        { questionId: question.id, prompt: question.prompt, answer: text },
      ],
      ...(existing?.answer !== text
        ? { revisionId: uid(), proposalGenerated: false, commitment: '', signature: '' }
        : {}),
    });
  }
  function answerNext(skip = false, e?: FormEvent) {
    e?.preventDefault();
    const question = draft.questions[draft.questionIndex];
    if (!question) return;
    const record = draft.answers.find((a) => a.questionId === question.id);
    if (!skip && !record?.answer.trim()) {
      setError('Share a little context, or choose Skip this question.');
      return;
    }
    const updated = skip
      ? {
          ...draft,
          answers: [
            ...draft.answers.filter((a) => a.questionId !== question.id),
            { questionId: question.id, prompt: question.prompt, answer: '' },
          ],
          proposalGenerated: false,
        }
      : draft;
    if (draft.questionIndex < draft.questions.length - 1)
      move({ ...updated, questionIndex: draft.questionIndex + 1 });
    else if (updated.proposalGenerated) move({ ...updated, step: 4 });
    else void generate('proposal', updated);
  }
  function stop() {
    request.current?.abort();
    requestId.current++;
    setBusy('');
    setError('');
  }
  function goBack() {
    stop();
    if (draft.step === 3 && draft.questionIndex > 0)
      move({ ...draft, questionIndex: draft.questionIndex - 1 });
    else move({ ...draft, step: Math.max(0, draft.step - 1) });
  }
  function finish(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    try {
      completeOnboarding(draft);
      onComplete();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function cancel() {
    stop();
    try {
      cancelOnboarding();
      onComplete();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const end = addDays(draft.start, draft.lengthDays - 1);
  const shared = { draft, heading, next, finish, goBack, patch, end };
  return (
    <div className="onboarding-shell season-onboarding">
      <header className="onboarding-header">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">h</span>
          <span>
            hyperfocus<span className="brand-period">.</span>
          </span>
        </a>
        <div className="setup-header-right">
          <span className="onboarding-saved">
            <ShieldCheck size={14} />
            {draft.coachMode === 'guided'
              ? 'Private guided mode'
              : `Coach · ${status.provider ?? 'connected'}`}
          </span>
          {state.onboarding.completedAt !== null ? (
            <button
              className="icon-button"
              aria-label="Return to my current season"
              onClick={cancel}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </header>
      {draft.step === 0 ? (
        <main className="setup-welcome">
          <span className="setup-kicker">MAKE THE NEXT CHAPTER COUNT</span>
          <h1 ref={heading} tabIndex={-1}>
            A lot on your mind.
            <br />
            Let’s find <em>your focus.</em>
          </h1>
          <p>
            Make a little space to decide what deserves this season. A few meaningful intentions can
            give the next chapter a direction.
          </p>
          <p>
            Tell us what’s on your mind. We’ll ask a few questions, shape a plan together, and give
            your intentions somewhere to land.
          </p>
          <button className="button primary setup-start" onClick={() => next()}>
            Plan my season <ArrowRight size={18} />
          </button>
          <span className="setup-time">About five minutes. Progress saves as you go.</span>
          <div className="setup-rhythm">
            <div>
              <Compass size={23} />
              <strong>Find your direction</strong>
              <span>A season built around what matters.</span>
            </div>
            <div>
              <CalendarDays size={23} />
              <strong>Make room for it</strong>
              <span>Turn intentions into realistic time.</span>
            </div>
            <div>
              <Focus size={23} />
              <strong>Follow through</strong>
              <span>Focus, reflect, and find your rhythm.</span>
            </div>
          </div>
          {state.goals.length ? (
            <p className="setup-existing">
              Your existing work and signed commitments are kept while you plan.
            </p>
          ) : (
            <button
              className="text-button muted"
              onClick={() => {
                try {
                  replaceState(createState(true));
                  onComplete();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Explore an example workspace <ArrowRight size={13} />
            </button>
          )}
        </main>
      ) : (
        <>
          <nav className="setup-progress" aria-label="Setup progress">
            {chapters.slice(1).map((chapter, i) => (
              <div
                key={chapter}
                className={draft.step === i + 1 ? 'current' : draft.step > i + 1 ? 'complete' : ''}
                aria-current={draft.step === i + 1 ? 'step' : undefined}
              >
                <span>{draft.step > i + 1 ? <Check size={12} /> : i + 1}</span>
                <span>{chapter}</span>
              </div>
            ))}
          </nav>
          <main className={`setup-main ${draft.step === 4 ? 'setup-plan-page' : ''}`}>
            {draft.step === 1 ? (
              <SeasonSetup {...shared} />
            ) : draft.step === 2 ? (
              <Narrative {...shared} status={status} busy={!!busy} />
            ) : draft.step === 3 ? (
              <Conversation
                draft={draft}
                heading={heading}
                onAnswer={answer}
                onNext={(e) => answerNext(false, e)}
                onBack={goBack}
                onSkip={() => answerNext(true)}
                busy={!!busy}
              />
            ) : draft.step === 4 ? (
              <PlanReview
                {...shared}
                busy={!!busy}
                onRegenerate={() => void generate('proposal')}
              />
            ) : (
              <Commitment {...shared} />
            )}
            {busy ? (
              <div className="generation-status" role="status">
                <Sparkles size={16} />
                <span>
                  {busy === 'questions'
                    ? 'Finding questions for your season…'
                    : busy === 'proposal'
                      ? 'Putting your answers into a plan…'
                      : 'Drafting a commitment from your plan…'}
                </span>
                <button className="text-button" onClick={stop}>
                  Cancel
                </button>
              </div>
            ) : null}
          </main>
        </>
      )}
      {error ? (
        <div className="setup-error" role="alert">
          <p>{error}</p>
          {draft.coachMode === 'connected' ? (
            <p>
              Your answers are saved. Retry this step, or return to your story and choose private
              guided mode.
            </p>
          ) : null}
        </div>
      ) : null}
      <footer className="onboarding-footer">
        <span>A little clarity goes a long way.</span>
        <span>
          {draft.step > 0
            ? `${Math.min(draft.step, 5)} of 5 · ${chapters[Math.min(draft.step, 5)]}`
            : 'No account. No subscription. Your season.'}
        </span>
      </footer>
    </div>
  );
}
