import { Download, Upload, ShieldCheck, CalendarDays, ExternalLink } from 'lucide-react';
import {
  useStore,
  updateSettings,
  replaceState,
  getStartupError,
  restartOnboarding,
} from '../useWorkspace';
import { createState } from '../../domain/seed';
import { download, parseBackup, STORAGE_KEY } from '../../infrastructure/storage';
import { exportCalendar } from '../../infrastructure/calendar';
import { localDate } from '../../domain/model';
export function Settings({ notify }: { notify: (s: string) => void }) {
  const s = useStore();
  function run(action: () => void) {
    try {
      action();
      notify('Saved.');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE, YOUR RULES</div>
          <h1>Make yourself at home.</h1>
          <p>Your data stays in this browser. No account or subscription required.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="surface">
          <h2>The essentials</h2>
          <button
            className="text-button"
            onClick={() => {
              if (confirm('Revisit season setup? Existing goals and history will be kept.'))
                run(restartOnboarding);
            }}
          >
            Revisit season setup <ExternalLink size={14} />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(() =>
                updateSettings({
                  name: String(data.get('name')),
                  theme: data.get('theme') as 'light' | 'dark' | 'system',
                }),
              );
            }}
          >
            <label>
              Your name
              <input
                key={s.settings.name}
                name="name"
                maxLength={60}
                defaultValue={s.settings.name}
                placeholder="How should we greet you?"
              />
            </label>
            <label>
              Appearance
              <select key={s.settings.theme} name="theme" defaultValue={s.settings.theme}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">Follow my device</option>
              </select>
            </label>
            <button className="button primary">Save preferences</button>
          </form>
        </section>
        <section className="surface">
          <ShieldCheck size={24} />
          <h2>Keep your data yours.</h2>
          <p>
            Everything is stored locally on this browser profile. Clearing site data removes it.
            Export a backup regularly and before switching devices.
          </p>
          <div className="settings-actions">
            <button
              className="button"
              onClick={() => download(`hyperfocus-${localDate()}.json`, JSON.stringify(s, null, 2))}
            >
              <Download size={16} /> Export backup
            </button>
            <label className="button file-label">
              <Upload size={16} /> Import backup
              <input
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    if (file.size > 10_000_000) throw new Error('Backup exceeds the 10 MB limit.');
                    const data = parseBackup(await file.text());
                    if (
                      confirm(
                        'Replace all local data with this backup? Export your current data first.',
                      )
                    ) {
                      replaceState(data);
                      notify('Backup restored.');
                    }
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </label>
          </div>
          {getStartupError() ? (
            <button
              className="text-button danger"
              onClick={() =>
                download('hyperfocus-recovery.txt', localStorage.getItem(STORAGE_KEY) ?? '')
              }
            >
              Download unreadable data for recovery
            </button>
          ) : null}
        </section>
        <section className="surface">
          <CalendarDays size={24} />
          <h2>Take your plan with you.</h2>
          <p>
            Export scheduled blocks as an iCalendar file for Google Calendar, Apple Calendar, or
            Outlook. This is a one-way snapshot; changes do not sync back.
          </p>
          <button
            className="button"
            onClick={() =>
              download('hyperfocus-calendar.ics', exportCalendar(s.blocks), 'text/calendar')
            }
          >
            <Download size={16} /> Export calendar (.ics)
          </button>
          <p className="hint">
            Calendar OAuth and automatic two-way sync are not connected in this local-first edition.
          </p>
        </section>
        <section className="surface">
          <h2>Less noise, more room.</h2>
          <p>
            The companion Chrome extension can block websites while you focus. Enter one domain per
            line, without https:// or paths.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const domains = String(new FormData(e.currentTarget).get('domains'))
                .split(/\s+/)
                .map((d) => d.trim().toLowerCase())
                .filter(Boolean);
              run(() => updateSettings({ blockedDomains: [...new Set(domains)] }));
            }}
          >
            <label>
              Distracting websites
              <textarea
                name="domains"
                defaultValue={s.settings.blockedDomains.join('\n')}
                rows={5}
              />
            </label>
            <button className="button">Save blocklist</button>
          </form>
          <a
            href="https://github.com/saturn-raj/hyperfocus/tree/main/extension"
            className="text-button external-link"
            target="_blank"
            rel="noreferrer"
          >
            Extension setup <ExternalLink size={14} />
          </a>
        </section>
        <section className="surface">
          <h2>A fresh page</h2>
          <p>
            Clear the example goals and start your own season, or reload the demo. Both options
            replace all local data, including focus history.
          </p>
          <div className="settings-actions">
            <button
              className="button"
              onClick={() => {
                if (confirm('Erase all local data and start empty? Export a backup first.'))
                  run(() =>
                    replaceState({
                      ...createState(false),
                      onboarding: {
                        completedAt: Date.now(),
                        draft: null,
                        commitments: [],
                        acceptedProposalIds: [],
                        history: [],
                      },
                    }),
                  );
              }}
            >
              Start empty
            </button>
            <button
              className="button"
              onClick={() => {
                if (confirm('Replace all local data with the example workspace?'))
                  run(() => replaceState(createState(true)));
              }}
            >
              Load example workspace
            </button>
          </div>
        </section>
        <section className="surface about">
          <h2>Built in the open.</h2>
          <p>
            Hyperfocus is an independent, MIT-licensed implementation inspired by the goal-to-action
            workflow described publicly by Superfocus. It has its own code and identity.
          </p>
          <a
            className="text-button"
            href="https://github.com/saturn-raj/hyperfocus"
            target="_blank"
            rel="noreferrer"
          >
            Source code & documentation <ExternalLink size={14} />
          </a>
          <p className="hint">
            No telemetry. Connected coaching is optional and uses your server-configured provider.
          </p>
        </section>
      </div>
    </>
  );
}
