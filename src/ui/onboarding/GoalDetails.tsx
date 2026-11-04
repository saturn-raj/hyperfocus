import type { StepProps } from './types';
import { ArrowRight, Check } from 'lucide-react';
import type { OnboardingGoal } from '../../domain/model';
import { Actions } from './Actions';

export function GoalDetails({
  draft,
  heading,
  next,
  goal,
  activeGoal,
  setActiveGoal,
  goalPatch,
  patch,
  setError,
  goBack,
}: Pick<
  StepProps,
  | 'draft'
  | 'heading'
  | 'next'
  | 'goal'
  | 'activeGoal'
  | 'setActiveGoal'
  | 'goalPatch'
  | 'patch'
  | 'setError'
  | 'goBack'
>) {
  return goal ? (
    <form onSubmit={next}>
      <span className="onboarding-eyebrow">TURN AN INTENTION INTO AN OUTCOME</span>
      <h1 ref={heading} tabIndex={-1}>
        Let’s make it
        <br />
        <em>mean something.</em>
      </h1>
      <p className="onboarding-description">
        A reason to care, a way to recognise progress, and one small place to start.
      </p>
      <div className="onboarding-goal-tabs" role="group" aria-label="Your draft goals">
        {draft.goals.map((g, i) => (
          <button
            type="button"
            key={g.id}
            className={activeGoal === i ? 'selected' : ''}
            aria-pressed={activeGoal === i}
            onClick={() => setActiveGoal(i)}
          >
            <span className={`goal-dot ${g.color}`} />
            <span>{g.title}</span>
            {g.why && g.success && g.firstAction ? <Check size={13} /> : null}
          </button>
        ))}
      </div>
      <div className={`onboarding-goal-detail ${goal.color}`}>
        <div className="onboarding-goal-number">
          GOAL {activeGoal + 1} OF {draft.goals.length}
        </div>
        <label>
          Make the goal your own
          <input
            required
            value={goal.title}
            maxLength={300}
            onChange={(e) => goalPatch(goal.id, { title: e.target.value })}
          />
        </label>
        <label>
          Why does this matter to you?
          <textarea
            rows={2}
            maxLength={2000}
            value={goal.why}
            onChange={(e) => goalPatch(goal.id, { why: e.target.value })}
            placeholder="What would this make possible for you?"
          />
        </label>
        <label>
          What would “done” or meaningful progress look like?
          <input
            maxLength={300}
            value={goal.success}
            onChange={(e) => goalPatch(goal.id, { success: e.target.value })}
            placeholder="A concrete finish line you can recognise"
          />
        </label>
        <label>
          What’s the first small action?
          <input
            maxLength={300}
            value={goal.firstAction}
            onChange={(e) => goalPatch(goal.id, { firstAction: e.target.value })}
            placeholder="Something you could sit down and do this week"
          />
        </label>
        <div className="form-row">
          <label>
            This goal’s place in your season
            <select
              value={goal.priority}
              onChange={(e) => {
                const priority = e.target.value as OnboardingGoal['priority'];
                patch({
                  goals: draft.goals.map((g) =>
                    g.id === goal.id
                      ? { ...g, priority }
                      : priority === 'core' && g.priority === 'core'
                        ? { ...g, priority: 'secondary' }
                        : g,
                  ),
                });
              }}
            >
              <option value="core">Core focus · comes first</option>
              <option value="secondary">Secondary · make steady progress</option>
              <option value="support">Support · keep it going</option>
            </select>
          </label>
          <label>
            First action, in minutes
            <input
              type="number"
              min={5}
              max={240}
              value={goal.firstDuration}
              onChange={(e) => {
                const duration = Number(e.target.value);
                if (duration >= 5 && duration <= 240)
                  goalPatch(goal.id, { firstDuration: duration });
              }}
            />
          </label>
        </div>
      </div>
      {activeGoal < draft.goals.length - 1 ? (
        <button
          type="button"
          className="text-button next-goal"
          onClick={() => {
            if (!goal.why.trim() || !goal.success.trim() || !goal.firstAction.trim()) {
              setError('Add a reason, a finish line, and a first action for this goal.');
              return;
            }
            setError('');
            setActiveGoal(activeGoal + 1);
          }}
        >
          Next goal <ArrowRight size={15} />
        </button>
      ) : null}
      <Actions onBack={goBack} nextLabel="Make it realistic" />
    </form>
  ) : null;
}
