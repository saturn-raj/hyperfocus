import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createStaticHandler } from '../../server/static-handler';
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'hyperfocus-static-test-'));
  directories.push(root);
  const dist = join(root, 'dist');
  await mkdir(join(dist, 'assets'), { recursive: true });
  await writeFile(join(dist, 'index.html'), '<html>Hyperfocus</html>');
  await writeFile(join(dist, 'assets', 'app.js'), 'console.log("loaded")');
  await writeFile(join(root, 'private.txt'), 'private outside build');
  return { root, dist };
}
async function request(dist: string, path: string, method = 'GET') {
  const data = {
    statusCode: 200,
    headers: {} as Record<string, string | number>,
    body: undefined as Buffer | string | undefined,
  };
  const response = Object.assign(new EventEmitter(), data, {
    setHeader(this: typeof data, key: string, value: string | number) {
      this.headers[key.toLowerCase()] = value;
    },
    end(this: typeof data, body?: Buffer | string) {
      this.body = body;
    },
  });
  await createStaticHandler(dist)(
    { method, url: path } as IncomingMessage,
    response as unknown as ServerResponse,
  );
  return {
    status: response.statusCode,
    body: response.body?.toString(),
    headers: response.headers,
  };
}
describe('production static serving without network', () => {
  it('serves the app and immutable build assets, including HEAD without a body', async () => {
    const { dist } = await fixture();
    const page = await request(dist, '/');
    expect(page.status).toBe(200);
    expect(page.body).toContain('Hyperfocus');
    expect(page.headers['content-type']).toContain('text/html');
    const asset = await request(dist, '/assets/app.js');
    expect(asset.headers['cache-control']).toContain('immutable');
    expect(asset.headers['content-type']).toContain('javascript');
    const head = await request(dist, '/assets/app.js', 'HEAD');
    expect(head.status).toBe(200);
    expect(head.body).toBeUndefined();
    expect(head.headers['content-length']).toBeGreaterThan(0);
  });
  it('falls back only for app routes and never for missing assets', async () => {
    const { dist } = await fixture();
    expect((await request(dist, '/my-season')).body).toContain('Hyperfocus');
    expect((await request(dist, '/assets/missing.js')).status).toBe(404);
    expect((await request(dist, '/.env')).status).toBe(404);
    expect((await request(dist, '/assets/missing')).status).toBe(404);
  });
  it('rejects traversal, escaped paths and symlinks outside the build', async () => {
    const { root, dist } = await fixture();
    await symlink(join(root, 'private.txt'), join(dist, 'leak.txt'));
    for (const path of ['/%2e%2e%2fprivate.txt', '/leak.txt', '/%00', '/%5cprivate.txt', '/%zz']) {
      const result = await request(dist, path);
      expect([400, 404]).toContain(result.status);
      expect(result.body).not.toContain('private outside build');
    }
  });
  it('gives build and method errors without exposing disk paths', async () => {
    const { dist } = await fixture();
    const missing = await request(join(dist, 'absent'), '/');
    expect(missing.status).toBe(503);
    expect(missing.body).toContain('npm run build');
    expect(missing.body).not.toContain(dist);
    expect((await request(dist, '/', 'POST')).status).toBe(405);
  });
});
