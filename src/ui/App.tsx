import { lazy, Suspense, useEffect, useState } from 'react';
import {
  CalendarDays,
  Flag,
  Focus as FocusIcon,
  Compass as CompassIcon,
  Settings as SettingsIcon,
  Search,
  ArrowUpRight,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useStore, getStartupError } from './useWorkspace';
import { remaining } from '../domain/planning';
import { localDate } from '../domain/model';
import { Planner } from './pages/Planner';
import { Modal } from './components/Modal';
import { TaskEditor } from './components/Editors';
const Onboarding = lazy(() =>
  import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })),
);
const Season = lazy(() => import('./pages/Season').then((m) => ({ default: m.Season }))),
  Focus = lazy(() => import('./pages/Focus').then((m) => ({ default: m.Focus }))),
  Compass = lazy(() => import('./pages/Compass').then((m) => ({ default: m.Compass }))),
  Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const pages = [
  { id: 'planner', label: 'My week', icon: CalendarDays },
  { id: 'season', label: 'My season', icon: Flag },
  { id: 'focus', label: 'Focus', icon: FocusIcon },
  { id: 'compass', label: 'Compass', icon: CompassIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;
type Page = (typeof pages)[number]['id'];
function currentPage(): Page {
  const hash = location.hash.slice(1);
  return pages.find((p) => p.id === hash)?.id ?? 'planner';
}
export function App() {
  const s = useStore();
  const [page, setPage] = useState<Page>(currentPage),
    [message, setMessage] = useState(''),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(''),
    [newTask, setNewTask] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  function navigate(p: Page) {
    location.assign(`#${p}`);
    setPage(p);
  }
  useEffect(() => {
    const onHash = () => setPage(currentPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (s.onboarding.completedAt === null) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [s.onboarding.completedAt]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 7000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        s.settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : s.settings.theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [s.settings.theme]);
  useEffect(() => {
    const send = () => {
      const t = s.timer;
      window.postMessage(
        {
          type: 'HYPERFOCUS_SESSION',
          active: !!t && t.runningSince !== null && remaining(t, Date.now()) > 0,
          expiresAt: t ? Date.now() + remaining(t, Date.now()) * 1000 : Date.now(),
          domains: s.settings.blockedDomains,
        },
        location.origin,
      );
    };
    send();
    const interval = setInterval(send, 2000);
    return () => clearInterval(interval);
  }, [s.timer, s.settings.blockedDomains]);
  if (
    (s.onboarding.completedAt === null ||
      (s.onboarding.draft && s.onboarding.draft.revisionId !== 'legacy')) &&
    !getStartupError()
  ) {
    return (
      <Suspense
        fallback={
          <div className="empty-state" role="status">
            Getting your season ready…
          </div>
        }
      >
        <Onboarding onComplete={() => navigate('season')} />
      </Suspense>
    );
  }
  const notify = (text: string) => setMessage(text);
  const results = [
    ...s.goals.map((g) => ({ id: g.id, title: g.title, kind: 'Goal', page: 'season' as Page })),
    ...s.tasks.map((t) => ({ id: t.id, title: t.title, kind: 'Task', page: 'planner' as Page })),
  ]
    .filter((x) => x.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 12);
  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#planner" aria-label="Hyperfocus home">
          <span className="brand-mark">h</span>
          <span>
            hyperfocus<span className="brand-period">.</span>
          </span>
        </a>
        <a href="#settings" className="workspace">
          <span className="avatar">{s.settings.name?.[0]?.toUpperCase() ?? 'Y'}</span>
          <span>
            {s.settings.name ? `${s.settings.name}’s space` : 'Your personal space'}
            <small>Make every week meaningful</small>
          </span>
        </a>
        <button className="search-button" onClick={() => setSearch(true)}>
          <Search size={16} />
          <span>Find anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages
            .filter((p) => p.id !== 'settings')
            .map((p) => (
              <a
                key={p.id}
                aria-label={p.label}
                href={`#${p.id}`}
                onClick={() => navigate(p.id)}
                aria-current={page === p.id ? 'page' : undefined}
                className={page === p.id ? 'active' : ''}
              >
                <p.icon size={19} />
                <span>{p.label}</span>
                {p.id === 'focus' && s.timer ? <span className="live-indicator" /> : null}
              </a>
            ))}
        </nav>
        <div className="sidebar-season">
          <span className="section-label">YOUR NORTH STAR</span>
          <p>{s.season.title}</p>
          <a href="#season">
            One season. A few good goals.
            <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="sidebar-bottom">
          <span className="local-badge">
            <span className="status-dot" /> Saved on this device
          </span>
          <a href="#settings" className={page === 'settings' ? 'active' : ''}>
            <SettingsIcon size={18} />
            <span>Settings & data</span>
          </a>
          <a
            href="https://github.com/saturn-raj/hyperfocus"
            target="_blank"
            rel="noreferrer"
            className="open-source-link"
          >
            Open source. Yours to shape. <ArrowUpRight size={13} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button sidebar-toggle"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <span className="breadcrumb">
              Your workspace <span>/</span>{' '}
              <strong>{pages.find((p) => p.id === page)?.label}</strong>
            </span>
          </div>
          <div>
            <a href="#settings" className="icon-button" aria-label="Settings">
              <SettingsIcon size={17} />
            </a>
            <span className="top-date">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {s.timer && page !== 'focus' ? (
              <button className="button small focus-live" onClick={() => navigate('focus')}>
                <FocusIcon size={14} /> Return to focus
              </button>
            ) : (
              <button className="button small" onClick={() => setNewTask(true)}>
                <Plus size={15} /> Quick add
              </button>
            )}
          </div>
        </header>
        <main id="main-content">
          {getStartupError() ? (
            <p className="error" role="alert">
              {getStartupError()}
            </p>
          ) : null}
          <Suspense
            fallback={
              <div className="empty-state" role="status">
                Opening your workspace…
              </div>
            }
          >
            {page === 'planner' ? (
              <Planner notify={notify} onFocus={() => navigate('focus')} />
            ) : page === 'season' ? (
              <Season notify={notify} />
            ) : page === 'focus' ? (
              <Focus notify={notify} />
            ) : page === 'compass' ? (
              <Compass notify={notify} onPlan={() => navigate('planner')} />
            ) : (
              <Settings notify={notify} />
            )}
          </Suspense>
          <footer className="main-footer">
            <span>A little less busy. A little more meaningful.</span>
            <span>{localDate()} · Hyperfocus</span>
          </footer>
        </main>
      </div>
      {message ? (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setMessage('')}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      {search ? (
        <Modal
          title="Find your next step"
          onClose={() => {
            setSearch(false);
            setQuery('');
          }}
        >
          <label>
            Search goals and tasks
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
            />
          </label>
          <div className="search-results">
            {results.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => {
                  navigate(r.page);
                  setSearch(false);
                }}
              >
                <span>{r.title}</span>
                <small>{r.kind}</small>
              </button>
            ))}
            {!results.length ? <p className="muted">No matches. Try a different word.</p> : null}
          </div>
        </Modal>
      ) : null}
      {newTask ? <TaskEditor onClose={() => setNewTask(false)} /> : null}
    </div>
  );
}
