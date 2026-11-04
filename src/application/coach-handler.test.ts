import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { createCoachHandler, type CoachHandlerOptions } from '../../server/coach-handler';

const context = {
  brainDump: 'I want to ship a useful product and keep exercising.',
  seasonDays: 84,
  name: 'Avery',
  answers: [],
};
const env = {
  COACH_BASE_URL: 'https://coach.example.test/v1',
  COACH_MODEL: 'test-model',
  COACH_API_KEY: 'private-server-key-never-in-client',
};
const plan = {
  goals: [
    {
      title: 'Ship a first release',
      why: 'Help people solve a real problem',
      success: 'Three people use the release',
      priority: 'core',
      weeklyMinutes: 240,
      firstAction: 'Write the release scope',
      firstDuration: 30,
    },
  ],
  supportAreas: [{ title: 'Health', description: 'Maintain a regular exercise habit' }],
};
function provider(content: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
}
async function call(
  options: CoachHandlerOptions,
  input: unknown = { action: 'plan', context },
  configuration: {
    headers?: Record<string, string>;
    method?: string;
    path?: string;
    raw?: string;
  } = {},
) {
  const headers = {
    host: '127.0.0.1:5180',
    origin: 'http://127.0.0.1:5180',
    'content-type': 'application/json',
    ...configuration.headers,
  };
  const request = Readable.from([configuration.raw ?? JSON.stringify(input)]);
  Object.assign(request, {
    headers,
    method: configuration.method ?? 'POST',
    url: configuration.path ?? '/api/coach',
  });
  const events = new EventEmitter();
  const result = {
    statusCode: 200,
    headers: {} as Record<string, string | number | readonly string[]>,
    body: '',
    writableEnded: false,
    destroyed: false,
  };
  const response = Object.assign(events, result, {
    setHeader(this: typeof result, name: string, value: string | number | readonly string[]) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    end(this: typeof result, body?: string) {
      this.body = body ?? '';
      this.writableEnded = true;
      return this;
    },
  });
  await createCoachHandler(options)(
    request as unknown as IncomingMessage,
    response as unknown as ServerResponse,
  );
  return { status: response.statusCode, body: response.body, headers: response.headers };
}
describe('connected coaching middleware without external network', () => {
  it('stays disabled without configuration and never invokes a provider', async () => {
    const fake = provider({});
    const status = await call(
      { env: {}, fetch: fake },
      {},
      { method: 'GET', path: '/api/coach/status' },
    );
    expect(JSON.parse(status.body)).toEqual({ configured: false, provider: null });
    const result = await call({ env: {}, fetch: fake });
    expect(result.status).toBe(503);
    expect(result.body).toContain('COACH_BASE_URL');
    expect(fake).not.toHaveBeenCalled();
  });
  it('returns only provider hostname in status, never credentials', async () => {
    const result = await call({ env }, {}, { method: 'GET', path: '/api/coach/status' });
    expect(JSON.parse(result.body)).toEqual({ configured: true, provider: 'coach.example.test' });
    expect(result.body).not.toContain(env.COACH_API_KEY);
  });
  it('validates and returns a plan while holding credentials only in the provider header', async () => {
    const fake = provider(plan);
    const result = await call({ env, fetch: fake });
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ plan });
    expect(result.body).not.toContain(env.COACH_API_KEY);
    const [url, request] = fake.mock.calls[0];
    expect(url).toBe('https://coach.example.test/v1/chat/completions');
    expect(request?.headers).toMatchObject({ Authorization: `Bearer ${env.COACH_API_KEY}` });
    expect(JSON.stringify(JSON.parse(String(request?.body)))).not.toContain(env.COACH_API_KEY);
  });
  it('supports adaptive questions and an editable commitment envelope', async () => {
    const questions = {
      questions: [
        {
          id: 'first-customer',
          prompt: 'Who would benefit first?',
          options: ['An individual', 'A small team'],
        },
      ],
    };
    const q = await call({ env, fetch: provider(questions) }, { action: 'questions', context });
    expect(JSON.parse(q.body)).toEqual(questions);
    const commitment = {
      commitment: 'I will protect a small amount of time for the work I chose.',
    };
    const c = await call(
      { env, fetch: provider(commitment) },
      { action: 'commitment', context, plan },
    );
    expect(JSON.parse(c.body)).toEqual(commitment);
  });
  it('permits an explicitly configured local Ollama-compatible endpoint without a key', async () => {
    const fake = provider(plan);
    const result = await call({
      env: { COACH_BASE_URL: 'http://127.0.0.1:11434/v1', COACH_MODEL: 'local-model' },
      fetch: fake,
    });
    expect(result.status).toBe(200);
    expect(fake.mock.calls[0][0]).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(fake.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
  });
  it('rejects malformed model output, extra fields and duplicate core goals', async () => {
    for (const output of [
      { ...plan, extra: 'not allowed' },
      { goals: [...plan.goals, ...plan.goals], supportAreas: [] },
      {
        questions: [
          { id: 'x', prompt: 'One?' },
          { id: 'x', prompt: 'Two?' },
        ],
      },
    ]) {
      const result = await call(
        { env, fetch: provider(output) },
        'questions' in output ? { action: 'questions', context } : { action: 'plan', context },
      );
      expect(result.status).toBe(502);
      expect(result.body).toContain('invalid structured');
    }
  });
  it('rejects invalid JSON and wrong request contracts before contacting the provider', async () => {
    const fake = provider(plan);
    expect((await call({ env, fetch: fake }, {}, { raw: '{' })).status).toBe(400);
    expect(
      (await call({ env, fetch: fake }, { action: 'plan', context: { ...context, seasonDays: 0 } }))
        .status,
    ).toBe(400);
    expect(fake).not.toHaveBeenCalled();
  });
  it('bounds declared and streamed request bodies to 64 KB', async () => {
    const fake = provider(plan);
    expect(
      (await call({ env, fetch: fake }, {}, { headers: { 'content-length': '65537' } })).status,
    ).toBe(413);
    expect((await call({ env, fetch: fake }, {}, { raw: 'x'.repeat(65537) })).status).toBe(413);
    expect(fake).not.toHaveBeenCalled();
  });
  it('rejects remote, spoofed and cross-origin requests', async () => {
    const fake = provider(plan);
    const forbiddenHeaders: Record<string, string>[] = [
      { origin: 'https://attacker.example' },
      { host: 'attacker.example', origin: 'http://attacker.example' },
      { origin: 'http://127.0.0.1:9999' },
      { origin: 'null' },
      { 'sec-fetch-site': 'cross-site' },
    ];
    for (const headers of forbiddenHeaders) {
      expect((await call({ env, fetch: fake }, {}, { headers })).status).toBe(403);
    }
    expect(fake).not.toHaveBeenCalled();
  });
  it('rejects insecure remote and credential-bearing base URLs without leaking them', async () => {
    for (const base of [
      'http://coach.example/v1',
      `https://user:${env.COACH_API_KEY}@coach.example/v1`,
      `https://coach.example/v1?key=${env.COACH_API_KEY}`,
    ]) {
      const result = await call({ env: { ...env, COACH_BASE_URL: base } });
      expect(result.status).toBe(503);
      expect(result.body).not.toContain(env.COACH_API_KEY);
    }
  });
  it('never leaks provider errors or a credential echoed in a valid response', async () => {
    const throwing = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error(`Bad request ${env.COACH_API_KEY}`));
    const failed = await call({ env, fetch: throwing });
    expect(failed.status).toBe(502);
    expect(failed.body).not.toContain(env.COACH_API_KEY);
    const echoed = await call(
      { env, fetch: provider({ commitment: env.COACH_API_KEY }) },
      { action: 'commitment', context },
    );
    expect(echoed.status).toBe(502);
    expect(echoed.body).not.toContain(env.COACH_API_KEY);
  });
  it('aborts a hanging provider with an actionable timeout', async () => {
    const hanging: typeof fetch = (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
          once: true,
        });
      });
    const result = await call({ env, fetch: hanging, timeoutMs: 5 });
    expect(result.status).toBe(504);
    expect(result.body).toContain('too long');
  });
  it('bounds provider bodies and suppresses upstream response details', async () => {
    const huge = vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(262145)));
    expect((await call({ env, fetch: huge })).status).toBe(502);
    const denied = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(env.COACH_API_KEY, { status: 401 }));
    const result = await call({ env, fetch: denied });
    expect(result.status).toBe(502);
    expect(result.body).not.toContain(env.COACH_API_KEY);
  });
});
