const origins = new Set([
  'http://localhost:5180',
  'http://127.0.0.1:5180',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
let queue = Promise.resolve();
async function replaceRules(domains) {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: rules.map((r) => r.id),
    addRules: domains.map((domain, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'block' },
      condition: { requestDomains: [domain], resourceTypes: ['main_frame'] },
    })),
  });
}
async function sync() {
  const { session } = await chrome.storage.session.get('session');
  const active =
    session && session.expiresAt > Date.now() && session.heartbeat > Date.now() - 15000;
  await replaceRules(active ? session.domains : []);
  await chrome.action.setBadgeText({ text: active ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#315bcf' });
}
chrome.runtime.onMessage.addListener((message, sender) => {
  let origin;
  try {
    origin = new URL(sender.url).origin;
  } catch {
    return;
  }
  if (
    !origins.has(origin) ||
    message.type !== 'session' ||
    typeof message.active !== 'boolean' ||
    !Number.isFinite(message.expiresAt) ||
    !Array.isArray(message.domains) ||
    message.domains.length > 50 ||
    !message.domains.every((d) => typeof d === 'string' && d.length <= 253 && domainPattern.test(d))
  )
    return;
  queue = queue
    .catch(() => {})
    .then(async () => {
      await chrome.storage.session.set({
        session: message.active
          ? {
              domains: message.domains,
              expiresAt: Math.min(message.expiresAt, Date.now() + 8 * 3600000),
              heartbeat: Date.now(),
            }
          : null,
      });
      await sync();
    });
});
chrome.alarms.create('expire', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => {
  queue = queue.catch(() => {}).then(sync);
});
chrome.runtime.onStartup.addListener(() => {
  queue = queue.catch(() => {}).then(sync);
});
chrome.runtime.onInstalled.addListener(() => {
  queue = queue.catch(() => {}).then(sync);
});
