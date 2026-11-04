// Only the documented local development and production-preview origins may control blocking.
const origins = new Set([
  'http://localhost:5180',
  'http://127.0.0.1:5180',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);
if (origins.has(location.origin))
  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      event.data?.type !== 'HYPERFOCUS_SESSION'
    )
      return;
    const { active, expiresAt, domains } = event.data;
    if (
      typeof active !== 'boolean' ||
      typeof expiresAt !== 'number' ||
      !Number.isFinite(expiresAt) ||
      !Array.isArray(domains) ||
      domains.length > 50
    )
      return;
    chrome.runtime.sendMessage({ type: 'session', active, expiresAt, domains }).catch(() => {});
  });
