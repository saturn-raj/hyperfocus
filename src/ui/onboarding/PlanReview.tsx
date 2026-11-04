import { useState, type FormEvent } from 'react';
import {
  Rocket,
  BriefcaseBusiness,
  MessageCircle,
  Camera,
  BookOpen,
  Flag,
  Dumbbell,
  Heart,
  House,
  Plus,
  Trash2,
  Pencil,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { uid, hours, clock, type OnboardingGoal, type SupportArea } from '../../domain/model';
import { Modal } from '../components/Modal';
import type { StepProps } from './types';
import { Actions } from './Actions';
function goalIcon(title: string) {
  if (/customer|launch|ship|product|business/i.test(title)) return Rocket;
  if (/interview|job|compan|career/i.test(title)) return BriefcaseBusiness;
  if (/video|insta|youtube/i.test(title)) return Camera;
  if (/post|twitter|writ/i.test(title)) return MessageCircle;
  if (/read|learn/i.test(title)) return BookOpen;
  return Flag;
}
export function PlanReview({
  draft,
  heading,
  next,
  goBack,
  patch,
  end,
  busy,
  onRegenerate,
}: {
  draft: StepProps['draft'];
  heading: StepProps['heading'];
  next: StepProps['next'];
  goBack: () => void;
  patch: StepProps['patch'];
  end: string;
  busy: boolean;
  onRegenerate: () => void;
}) {
  const [goal, setGoal] = useState<OnboardingGoal | null>(null),
    [area, setArea] = useState<SupportArea | null>(null);
  const total = draft.goals.reduce((sum, g) => sum + g.weeklyMinutes, 0),
    core = draft.goals.find((g) => g.priority === 'core');
  function saveGoal(g: OnboardingGoal) {
    const goals = draft.goals.some((x) => x.id === g.id)
      ? draft.goals.map((x) => (x.id === g.id ? g : x))
      : [...draft.goals, g];
    patch({
      goals: goals.map((x) =>
        g.priority === 'core' && x.id !== g.id ? { ...x, priority: 'secondary' } : x,
      ),
    });
    setGoal(null);
  }
  function saveArea(a: SupportArea) {
    patch({
      proposedSupportAreas: draft.proposedSupportAreas.some((x) => x.id === a.id)
        ? draft.proposedSupportAreas.map((x) => (x.id === a.id ? a : x))
        : [...draft.proposedSupportAreas, a],
    });
    setArea(null);
  }
  return (
    <>
      <form onSubmit={next}>
        <div className="plan-review-heading">
          <span className="setup-kicker">YOUR ANSWERS, WITH A LITTLE DIRECTION</span>
          <h1 ref={heading} tabIndex={-1}>
            Your plan for this season
          </h1>
          <p className="setup-description">
            A draft built from what you shared. Keep what fits, change what doesn’t, and make it
            your own.
          </p>
        </div>
        <section className="plan-section">
          <h2>Seasonal goals</h2>
          <p>The outcomes you want to move toward in the next {draft.lengthDays} days.</p>
          <div className="proposal-list">
            {draft.goals.map((g) => {
              const Icon = goalIcon(g.title);
              return (
                <article className={`proposal-row ${g.color}`} key={g.id}>
                  <span className="proposal-icon">
                    <Icon size={25} />
                  </span>
                  <div className="proposal-body">
                    <button
                      className="proposal-title"
                      type="button"
                      aria-label={`Edit goal ${g.title}`}
                      onClick={() => setGoal(g)}
                    >
                      {g.title}
                      <Pencil size={13} />
                    </button>
                    <select
                      aria-label={`Priority for ${g.title}`}
                      className={`priority-select ${g.priority === 'core' ? 'core' : 'secondary'}`}
                      value={g.priority === 'core' ? 'core' : 'secondary'}
                      onChange={(e) => {
                        const priority = e.target.value as 'core' | 'secondary';
                        patch({
                          goals: draft.goals.map((x) =>
                            x.id === g.id
                              ? { ...x, priority }
                              : priority === 'core' && x.priority === 'core'
                                ? { ...x, priority: 'secondary' }
                                : x,
                          ),
                        });
                      }}
                    >
                      <option value="core">Core</option>
                      <option value="secondary">Secondary</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="proposal-delete icon-button"
                    aria-label={`Remove proposed goal ${g.title}`}
                    onClick={() => patch({ goals: draft.goals.filter((x) => x.id !== g.id) })}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              );
            })}
          </div>
          {draft.goals.length < 10 ? (
            <button
              type="button"
              className="proposal-add"
              onClick={() =>
                setGoal({
                  id: uid(),
                  title: '',
                  why: '',
                  success: '',
                  firstAction: '',
                  firstDuration: 30,
                  weeklyMinutes: 60,
                  priority: draft.goals.some((g) => g.priority === 'core') ? 'secondary' : 'core',
                  color: 'blue',
                  milestones: [],
                })
              }
            >
              <Plus size={23} /> Add goal
            </button>
          ) : null}
          {draft.goals.length > 5 ? (
            <p className="plan-advice">
              A season usually works best with three to five goals. Choose what deserves your
              attention now.
            </p>
          ) : null}
        </section>
        <section className="plan-section support-section">
          <h2>Support areas</h2>
          <p>The things you want to keep taking care of while you work on your goals.</p>
          <div className="proposal-list">
            {draft.proposedSupportAreas.map((a) => {
              const Icon = /health|fitness|gym/i.test(a.title)
                ? Dumbbell
                : /relationship|friend|family/i.test(a.title)
                  ? Heart
                  : House;
              return (
                <article className={`proposal-row area-row ${a.color}`} key={a.id}>
                  <span className="proposal-icon">
                    <Icon size={25} />
                  </span>
                  <button
                    className="proposal-title"
                    type="button"
                    aria-label={`Edit support area ${a.title}`}
                    onClick={() => setArea(a)}
                  >
                    {a.title}
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="proposal-delete icon-button"
                    aria-label={`Remove proposed support area ${a.title}`}
                    onClick={() =>
                      patch({
                        proposedSupportAreas: draft.proposedSupportAreas.filter(
                          (x) => x.id !== a.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            className="proposal-add"
            onClick={() => setArea({ id: uid(), title: '', description: '', color: 'green' })}
          >
            <Plus size={23} /> Add support area
          </button>
        </section>
        <details
          className="proposal-details"
          open={total > draft.weeklyCapacity ? true : undefined}
        >
          <summary>
            Make the plan realistic{' '}
            <span>
              {hours(total)} / {hours(draft.weeklyCapacity)} available each week
            </span>
          </summary>
          <div className="proposal-details-body">
            <label>
              Hours available each week
              <input
                type="number"
                min={0.5}
                max={40}
                step={0.5}
                value={draft.weeklyCapacity / 60}
                onChange={(e) => {
                  const value = Number(e.target.value) * 60;
                  if (value >= 30 && value <= 2400) patch({ weeklyCapacity: value });
                }}
              />
            </label>
            {draft.goals.map((g) => (
              <label className="proposal-time-row" key={g.id}>
                <span>{g.title}</span>
                <input
                  aria-label={`Weekly hours for ${g.title}`}
                  type="number"
                  min={0.5}
                  max={40}
                  step={0.5}
                  value={g.weeklyMinutes / 60}
                  onChange={(e) => {
                    const minutes = Number(e.target.value) * 60;
                    if (minutes >= 30 && minutes <= 2400)
                      patch({
                        goals: draft.goals.map((x) =>
                          x.id === g.id ? { ...x, weeklyMinutes: minutes } : x,
                        ),
                      });
                  }}
                />
                <span>h/week</span>
              </label>
            ))}
            <p className={total > draft.weeklyCapacity ? 'danger' : ''}>
              {total > draft.weeklyCapacity
                ? `${hours(total - draft.weeklyCapacity)} over your capacity. Give a goal a smaller slice of the week.`
                : `${hours(draft.weeklyCapacity - total)} of breathing room for life around the plan.`}
            </p>
            <label className="onboarding-check">
              <input
                type="checkbox"
                checked={!!draft.firstBlock}
                onChange={(e) =>
                  patch({ firstBlock: e.target.checked ? { date: draft.start, start: 540 } : null })
                }
              />
              <span>Protect time for my first action</span>
            </label>
            {draft.firstBlock ? (
              <>
                <p>First: {core?.firstAction}</p>
                <div className="form-row">
                  <label>
                    Date
                    <input
                      required
                      type="date"
                      min={draft.start}
                      max={end}
                      value={draft.firstBlock.date}
                      onChange={(e) => {
                        if (e.target.value && draft.firstBlock)
                          patch({ firstBlock: { ...draft.firstBlock, date: e.target.value } });
                      }}
                    />
                  </label>
                  <label>
                    Start time
                    <input
                      required
                      type="time"
                      value={clock(draft.firstBlock.start)}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(':').map(Number);
                        if (draft.firstBlock && Number.isFinite(h) && Number.isFinite(m))
                          patch({ firstBlock: { ...draft.firstBlock, start: h * 60 + m } });
                      }}
                    />
                  </label>
                </div>
              </>
            ) : null}
          </div>
        </details>
        <details className="proposal-details">
          <summary>Your original answers</summary>
          <div className="proposal-details-body original-answers">
            <p>{draft.brainDump}</p>
            {draft.answers.map((a) => (
              <div key={a.questionId}>
                <strong>{a.prompt}</strong>
                <p>{a.answer || 'Skipped'}</p>
              </div>
            ))}
          </div>
        </details>
        <div className="plan-controls">
          <label>
            Season name
            <input
              value={draft.seasonTitle}
              maxLength={300}
              onChange={(e) => patch({ seasonTitle: e.target.value })}
              placeholder={`${draft.name}’s season`}
            />
          </label>
          <button
            type="button"
            className="text-button muted"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  'Replace the proposed goals with a fresh draft? Your original answers stay saved.',
                )
              )
                onRegenerate();
            }}
          >
            <RotateCcw size={13} /> Draft again from my answers
          </button>
        </div>
        <p className="plan-origin">
          {draft.coachMode === 'guided'
            ? 'This is a private, rule-based outline. Open each goal to refine its outcome and first action.'
            : 'Your connected coach suggested this plan. Review the details before committing.'}
        </p>
        <Actions
          onBack={goBack}
          nextLabel={busy ? 'Drafting your commitment…' : 'Continue'}
          disabled={busy}
        />
      </form>
      {goal ? <GoalDialog goal={goal} onClose={() => setGoal(null)} onSave={saveGoal} /> : null}
      {area ? <AreaDialog area={area} onClose={() => setArea(null)} onSave={saveArea} /> : null}
    </>
  );
}
function GoalDialog({
  goal,
  onSave,
  onClose,
}: {
  goal: OnboardingGoal;
  onSave: (g: OnboardingGoal) => void;
  onClose: () => void;
}) {
  const [g, setG] = useState(goal);
  return (
    <Modal title={goal.title ? 'Shape this goal' : 'Add a seasonal goal'} onClose={onClose}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSave({
            ...g,
            title: g.title.trim(),
            why: g.why.trim(),
            success: g.success.trim(),
            firstAction: g.firstAction.trim(),
          });
        }}
      >
        <label>
          Goal title
          <input
            autoFocus
            required
            maxLength={300}
            value={g.title}
            onChange={(e) => setG({ ...g, title: e.target.value })}
          />
        </label>
        <label>
          Why it matters
          <textarea
            required
            maxLength={2000}
            rows={2}
            value={g.why}
            onChange={(e) => setG({ ...g, why: e.target.value })}
          />
        </label>
        <label>
          What progress looks like
          <input
            required
            maxLength={300}
            value={g.success}
            onChange={(e) => setG({ ...g, success: e.target.value })}
          />
        </label>
        <label>
          First small action
          <input
            required
            maxLength={300}
            value={g.firstAction}
            onChange={(e) => setG({ ...g, firstAction: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Hours a week
            <input
              type="number"
              min={0.5}
              max={40}
              step={0.5}
              required
              value={g.weeklyMinutes / 60}
              onChange={(e) => setG({ ...g, weeklyMinutes: Number(e.target.value) * 60 })}
            />
          </label>
          <label>
            First action (minutes)
            <input
              type="number"
              min={5}
              max={240}
              required
              value={g.firstDuration}
              onChange={(e) => setG({ ...g, firstDuration: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          Priority
          <select
            value={g.priority === 'core' ? 'core' : 'secondary'}
            onChange={(e) => setG({ ...g, priority: e.target.value as 'core' | 'secondary' })}
          >
            <option value="core">Core focus</option>
            <option value="secondary">Secondary</option>
          </select>
        </label>
        <div className="modal-actions">
          <span />
          <button className="button primary">
            Keep this goal
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function AreaDialog({
  area,
  onSave,
  onClose,
}: {
  area: SupportArea;
  onSave: (a: SupportArea) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState(area);
  return (
    <Modal title={area.title ? 'Edit support area' : 'Add a support area'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...a, title: a.title.trim(), description: a.description.trim() });
        }}
      >
        <label>
          Area name
          <input
            required
            autoFocus
            maxLength={300}
            value={a.title}
            onChange={(e) => setA({ ...a, title: e.target.value })}
            placeholder="Health & Fitness"
          />
        </label>
        <label>
          What do you want to maintain?
          <textarea
            required
            maxLength={2000}
            value={a.description}
            onChange={(e) => setA({ ...a, description: e.target.value })}
            placeholder="A sustainable routine alongside the work."
          />
        </label>
        <label>
          Color
          <select
            value={a.color}
            onChange={(e) => setA({ ...a, color: e.target.value as SupportArea['color'] })}
          >
            <option value="green">Green</option>
            <option value="violet">Violet</option>
            <option value="blue">Blue</option>
            <option value="orange">Orange</option>
          </select>
        </label>
        <div className="modal-actions">
          <span />
          <button className="button primary">Keep this area</button>
        </div>
      </form>
    </Modal>
  );
}
