import { SeasonSetup } from '../onboarding/SeasonSetup';
import { BrainDump } from '../onboarding/BrainDump';
import { GoalDetails } from '../onboarding/GoalDetails';
import { Capacity } from '../onboarding/Capacity';
import { Review } from '../onboarding/Review';
import { Commitment } from '../onboarding/Commitment';
import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Compass,
  Focus,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { useStore, saveOnboardingDraft, completeOnboarding, replaceState } from '../useWorkspace';
import { createState } from '../../domain/seed';
import { addDays, type OnboardingDraft, type OnboardingGoal } from '../../domain/model';
import {
  createOnboardingDraft,
  goalsFromBrainDump,
  suggestedCommitment,
  validateOnboardingStep,
} from '../../domain/onboarding';
const chapters = [
  'Welcome',
  'Your season',
  'Make space',
  'Find direction',
  'Keep it real',
  'Your plan',
  'Your promise',
];
export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const state = useStore();
  const [draft, setDraft] = useState<OnboardingDraft>(
    () => state.onboarding.draft ?? createOnboardingDraft(state),
  );
  const [error, setError] = useState(''),
    [activeGoal, setActiveGoal] = useState(0),
    [suggestion, setSuggestion] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
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
  function patch(next: Partial<OnboardingDraft>) {
    persist({ ...draft, ...next });
  }
  function goalPatch(id: string, next: Partial<OnboardingGoal>) {
    const goals = draft.goals.map((g) => (g.id === id ? { ...g, ...next } : g));
    patch({
      goals,
      ...(next.title !== undefined ? { brainDump: goals.map((g) => g.title).join('\n') } : {}),
    });
  }
  function next(event?: FormEvent) {
    event?.preventDefault();
    const problem = validateOnboardingStep(draft);
    if (problem) {
      if (draft.step === 3) {
        const index = draft.goals.findIndex(
          (g) => !g.title.trim() || !g.why.trim() || !g.success.trim() || !g.firstAction.trim(),
        );
        if (index >= 0) setActiveGoal(index);
      }
      setError(problem);
      return;
    }
    try {
      let updated = { ...draft, step: Math.min(6, draft.step + 1) };
      if (draft.step === 2) {
        updated = { ...updated, goals: goalsFromBrainDump(draft.brainDump, draft.goals) };
        setActiveGoal(0);
      }
      if (draft.step === 5 && !draft.commitment.trim())
        updated = { ...updated, commitment: suggestedCommitment(draft) };
      if (persist(updated)) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => heading.current?.focus());
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function finish(e: FormEvent) {
    e.preventDefault();
    const problem = validateOnboardingStep(draft);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      completeOnboarding(draft);
      onComplete();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function goBack() {
    if (persist({ ...draft, step: Math.max(0, draft.step - 1) })) {
      setSuggestion('');
      requestAnimationFrame(() => heading.current?.focus());
    }
  }
  const total = draft.goals.reduce((sum, g) => sum + g.weeklyMinutes, 0),
    end = addDays(draft.start, draft.lengthDays - 1),
    core = draft.goals.find((g) => g.priority === 'core');
  const goal = draft.goals[Math.min(activeGoal, Math.max(0, draft.goals.length - 1))];
  const coachNote =
    draft.step === 1
      ? 'A season gives your ambitions a finish line. You can adjust it later.'
      : draft.step === 2
        ? 'Write freely. Start with what you want to change, build, learn, or make time for.'
        : draft.step === 3
          ? `“${goal?.title ?? 'Your goal'}” deserves a clear finish line. What would make you proud of the progress?`
          : draft.step === 4
            ? 'A plan is only useful if it fits the life you actually have. Leave some room for being human.'
            : draft.step === 5
              ? 'You made the choices. Here is how they fit together. Adjust anything that doesn’t feel right.'
              : 'This is a note to the version of you who will need a little encouragement a few weeks from now.';
  const stepProps = {
    draft,
    heading,
    next,
    patch,
    end,
    goBack,
    goal,
    activeGoal,
    setActiveGoal,
    goalPatch,
    setError,
    total,
    core,
    finish,
    setSuggestion,
    suggestion,
  };
  return (
    <div className={`onboarding-shell ${draft.step === 0 ? 'onboarding-welcome' : ''}`}>
      <header className="onboarding-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (draft.step) goBack();
          }}
          aria-label="Hyperfocus setup"
        >
          <span className="brand-mark">h</span>
          <span>
            hyperfocus<span className="brand-period">.</span>
          </span>
        </a>
        <div className="onboarding-saved">
          <ShieldCheck size={14} />
          <span>
            {state.onboarding.draft
              ? 'Progress saved on this device'
              : 'A little space, just for you'}
          </span>
        </div>
      </header>
      {draft.step === 0 ? (
        <main className="onboarding-intro">
          <div className="onboarding-intro-copy">
            <div className="onboarding-eyebrow">
              <span /> LESS BUSY. MORE MEANINGFUL.
            </div>
            <h1 ref={heading} tabIndex={-1}>
              Before you plan your week,
              <br />
              make room for <em>yourself.</em>
            </h1>
            <p>
              You have things you want to do. Things you keep putting off. And probably a little too
              much on your mind.
            </p>
            <p>
              Let’s turn all of that into a season with direction. We’ll take it one question at a
              time.
            </p>
            <button className="button primary onboarding-primary" onClick={() => next()}>
              Let’s find your focus <ArrowRight size={18} />
            </button>
            <span className="onboarding-time">
              About 5 minutes. Your answers stay on this device.
            </span>
            {state.goals.length ? (
              <p className="onboarding-preserve">
                Your existing goals, calendar, and focus history will be kept.
              </p>
            ) : (
              <button
                className="text-button onboarding-demo"
                onClick={() => {
                  try {
                    replaceState(createState(true));
                    onComplete();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Just looking around? Explore an example <ArrowUpRight size={14} />
              </button>
            )}
          </div>
          <div
            className="onboarding-intro-art"
            aria-label="Your goals become a season, your season becomes a plan, and your plan becomes focused progress"
          >
            <div className="intro-art-caption">THE BIG PICTURE</div>
            <div className="intro-rhythm">
              <span className="rhythm-icon">
                <Compass size={25} />
              </span>
              <div>
                <small>01 · GET CLEAR</small>
                <h2>What really matters to you?</h2>
                <p>A few goals for the season ahead.</p>
              </div>
            </div>
            <div className="rhythm-connector" />
            <div className="intro-rhythm">
              <span className="rhythm-icon">
                <CalendarDays size={25} />
              </span>
              <div>
                <small>02 · MAKE ROOM</small>
                <h2>Give it a place in your week.</h2>
                <p>A plan that leaves space for life.</p>
              </div>
            </div>
            <div className="rhythm-connector" />
            <div className="intro-rhythm">
              <span className="rhythm-icon">
                <Focus size={25} />
              </span>
              <div>
                <small>03 · FOLLOW THROUGH</small>
                <h2>One good session at a time.</h2>
                <p>Focus, reflect, and keep moving.</p>
              </div>
            </div>
            <div className="intro-art-note">
              <Sparkles size={17} />
              <p>
                You don’t need a perfect plan.
                <br />
                You need a meaningful place to start.
              </p>
            </div>
          </div>
        </main>
      ) : (
        <>
          <nav className="onboarding-progress" aria-label="Setup progress">
            {chapters.slice(1).map((chapter, i) => (
              <div
                key={chapter}
                className={draft.step === i + 1 ? 'current' : draft.step > i + 1 ? 'complete' : ''}
                aria-current={draft.step === i + 1 ? 'step' : undefined}
              >
                <span>
                  {draft.step > i + 1 ? <Check size={12} /> : String(i + 1).padStart(2, '0')}
                </span>
                <span>{chapter}</span>
              </div>
            ))}
          </nav>
          <main className="onboarding-main">
            <aside className="onboarding-coach">
              <span className="coach-avatar">
                <Sparkles size={22} />
              </span>
              <span className="onboarding-eyebrow">A LITTLE GUIDANCE</span>
              <p>{coachNote}</p>
              <div className="onboarding-coach-meta">
                <span>{String(draft.step).padStart(2, '0')} / 06</span>
                <span>{chapters[draft.step]}</span>
              </div>
              {draft.name ? (
                <span className="onboarding-personal">
                  Your pace, {draft.name}. There’s no rush.
                </span>
              ) : null}
            </aside>
            <section className="onboarding-content">
              {draft.step === 1 ? <SeasonSetup {...stepProps} /> : null}
              {draft.step === 2 ? <BrainDump {...stepProps} /> : null}
              {draft.step === 3 ? <GoalDetails {...stepProps} /> : null}
              {draft.step === 4 ? <Capacity {...stepProps} /> : null}
              {draft.step === 5 ? <Review {...stepProps} /> : null}
              {draft.step === 6 ? <Commitment {...stepProps} /> : null}
              {error ? (
                <p className="onboarding-error error" role="alert">
                  {error}
                </p>
              ) : null}
            </section>
          </main>
        </>
      )}
      {draft.step === 0 && error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="onboarding-footer">
        <span>A little clarity goes a long way.</span>
        <span>Private by default. Yours from the start.</span>
      </footer>
    </div>
  );
}
