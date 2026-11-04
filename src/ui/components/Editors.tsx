import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { uid, localDate, clock, type Goal, type Task, type Block } from '../../domain/model';
import {
  useStore,
  saveGoal,
  deleteGoal,
  saveTask,
  deleteTask,
  saveBlock,
  removeBlock,
} from '../useWorkspace';
export function GoalEditor({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const [g, setG] = useState<Goal>(
    goal ?? {
      id: uid(),
      title: '',
      why: '',
      color: 'blue',
      priority: 'core',
      weeklyMinutes: 240,
      milestones: [],
    },
  );
  const [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      saveGoal({ ...g, title: g.title.trim() });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={goal ? 'Edit goal' : 'Give your season a direction'}
      description="Choose an outcome that matters, then make space for it each week."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label>
          What do you want to achieve?
          <input
            autoFocus
            required
            maxLength={300}
            value={g.title}
            onChange={(e) => setG({ ...g, title: e.target.value })}
            placeholder="Launch my first product"
          />
        </label>
        <label>
          Why does this matter to you?
          <textarea
            value={g.why}
            maxLength={2000}
            onChange={(e) => setG({ ...g, why: e.target.value })}
            placeholder="A reason to come back when it gets difficult."
          />
        </label>
        <div className="form-row">
          <label>
            Priority
            <select
              value={g.priority}
              onChange={(e) => setG({ ...g, priority: e.target.value as Goal['priority'] })}
            >
              <option value="core">Core focus</option>
              <option value="secondary">Secondary focus</option>
              <option value="support">Support area</option>
            </select>
          </label>
          <label>
            Hours per week
            <input
              type="number"
              min="0.5"
              max="40"
              step="0.5"
              value={g.weeklyMinutes / 60}
              onChange={(e) => setG({ ...g, weeklyMinutes: Number(e.target.value) * 60 })}
            />
          </label>
        </div>
        <label>
          Goal color
          <select
            value={g.color}
            onChange={(e) => setG({ ...g, color: e.target.value as Goal['color'] })}
          >
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="orange">Orange</option>
            <option value="violet">Violet</option>
          </select>
        </label>
        <div className="label-row">
          <span>Milestones</span>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setG({ ...g, milestones: [...g.milestones, { id: uid(), title: '', done: false }] })
            }
          >
            <Plus size={14} /> Add milestone
          </button>
        </div>
        {g.milestones.map((m, i) => (
          <div className="milestone-edit" key={m.id}>
            <input
              aria-label={`Milestone ${i + 1}`}
              required
              maxLength={300}
              value={m.title}
              onChange={(e) =>
                setG({
                  ...g,
                  milestones: g.milestones.map((x) =>
                    x.id === m.id ? { ...x, title: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove milestone ${i + 1}`}
              onClick={() => setG({ ...g, milestones: g.milestones.filter((x) => x.id !== m.id) })}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          {goal ? (
            <button
              type="button"
              className="danger text-button"
              onClick={() => {
                if (
                  confirm('Delete this goal? Its tasks and history will be kept without a goal.')
                ) {
                  try {
                    deleteGoal(goal.id);
                    onClose();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }
              }}
            >
              Delete goal
            </button>
          ) : (
            <span />
          )}
          <button className="button primary" type="submit">
            Save goal
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TaskEditor({ task, onClose }: { task?: Task; onClose: () => void }) {
  const s = useStore();
  const [t, setT] = useState<Task>(
    task ?? { id: uid(), title: '', goalId: s.goals[0]?.id ?? null, duration: 30, done: false },
  );
  const [error, setError] = useState('');
  return (
    <Modal title={task ? 'Edit task' : 'One small step forward'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            saveTask({ ...t, title: t.title.trim() });
            onClose();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          Task
          <input
            autoFocus
            required
            maxLength={300}
            value={t.title}
            placeholder="What will move your goal forward?"
            onChange={(e) => setT({ ...t, title: e.target.value })}
          />
        </label>
        <GoalSelect value={t.goalId} onChange={(goalId) => setT({ ...t, goalId })} />
        <label>
          Estimated minutes
          <input
            type="number"
            min="5"
            max="480"
            required
            value={t.duration}
            onChange={(e) => setT({ ...t, duration: Number(e.target.value) })}
          />
        </label>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          {task ? (
            <button
              type="button"
              className="text-button danger"
              onClick={() => {
                try {
                  deleteTask(task.id);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Delete task
            </button>
          ) : (
            <span />
          )}
          <button className="button primary">Save task</button>
        </div>
      </form>
    </Modal>
  );
}
export function GoalSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const s = useStore();
  return (
    <label>
      Connected goal
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Personal / no goal</option>
        {s.goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
    </label>
  );
}
export function BlockEditor({
  block,
  task,
  date,
  start,
  onClose,
}: {
  block?: Block;
  task?: Task;
  date?: string;
  start?: number;
  onClose: () => void;
}) {
  const [b, setB] = useState<Block>(
    block ?? {
      id: uid(),
      title: task?.title ?? '',
      taskId: task?.id ?? null,
      goalId: task?.goalId ?? null,
      date: date ?? localDate(),
      start: start ?? 540,
      duration: task?.duration ?? 60,
      done: false,
    },
  );
  const [error, setError] = useState('');
  return (
    <Modal
      title={block ? 'Edit time block' : 'Make time for it'}
      description="Give this task a place in your day. Overlapping blocks are kept out."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            saveBlock({ ...b, title: b.title.trim() });
            onClose();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          What will you work on?
          <input
            autoFocus
            required
            maxLength={300}
            value={b.title}
            onChange={(e) => setB({ ...b, title: e.target.value })}
          />
        </label>
        <GoalSelect value={b.goalId} onChange={(goalId) => setB({ ...b, goalId })} />
        <div className="form-row">
          <label>
            Date
            <input
              required
              type="date"
              value={b.date}
              onChange={(e) => setB({ ...b, date: e.target.value })}
            />
          </label>
          <label>
            Start time
            <input
              required
              type="time"
              value={clock(b.start)}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                setB({ ...b, start: h * 60 + m });
              }}
            />
          </label>
        </div>
        <label>
          Duration (minutes)
          <input
            required
            type="number"
            min="5"
            max="480"
            value={b.duration}
            onChange={(e) => setB({ ...b, duration: Number(e.target.value) })}
          />
        </label>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          {block ? (
            <button
              type="button"
              className="text-button danger"
              onClick={() => {
                try {
                  removeBlock(block.id);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Delete block
            </button>
          ) : (
            <span />
          )}
          <button className="button primary">Save block</button>
        </div>
      </form>
    </Modal>
  );
}
