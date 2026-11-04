import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { uid, type SupportArea } from '../../domain/model';
import { saveSupportArea, deleteSupportArea } from '../useWorkspace';

export function AreaEditor({ area, onClose }: { area?: SupportArea; onClose: () => void }) {
  const [draft, setDraft] = useState<SupportArea>(
    area ?? { id: uid(), title: '', description: '', color: 'green' },
  );
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      saveSupportArea({
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
      });
      onClose();
    } catch (error) {
      setError((error as Error).message);
    }
  }

  return (
    <Modal
      title={area ? 'Edit support area' : 'Make room for everyday life'}
      description="Support areas hold the routines and responsibilities that need attention alongside your seasonal goals."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label>
          Support area name
          <input
            autoFocus
            required
            maxLength={300}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Health & Fitness"
          />
        </label>
        <label>
          What belongs here?
          <textarea
            maxLength={2000}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            placeholder="The routines and responsibilities you want to keep making room for."
          />
        </label>
        <label>
          Area color
          <select
            value={draft.color}
            onChange={(event) =>
              setDraft({ ...draft, color: event.target.value as SupportArea['color'] })
            }
          >
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="orange">Orange</option>
            <option value="violet">Violet</option>
          </select>
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          {area ? (
            <button
              type="button"
              className="danger text-button"
              onClick={() => {
                if (
                  !confirm(
                    'Delete this support area? Its tasks, calendar blocks and focus history will be kept without an area.',
                  )
                )
                  return;
                try {
                  deleteSupportArea(area.id);
                  onClose();
                } catch (error) {
                  setError((error as Error).message);
                }
              }}
            >
              Delete support area
            </button>
          ) : (
            <span />
          )}
          <button className="button primary" type="submit">
            Save support area
          </button>
        </div>
      </form>
    </Modal>
  );
}
