import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
function text(res: ServerResponse, status: number, message: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}
function inside(root: string, path: string) {
  const pathFromRoot = relative(root, path);
  return !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot);
}
/** Serves only canonical files inside the build directory; no source files or directory listings. */
export function createStaticHandler(distDirectory: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      text(res, 405, 'Use GET or HEAD to open the workspace.');
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      text(res, 400, 'Invalid URL.');
      return;
    }
    if (
      pathname.includes('\0') ||
      pathname.includes('\\') ||
      pathname.split('/').some((part) => part.startsWith('.'))
    ) {
      text(res, 404, 'Not found.');
      return;
    }
    let root: string;
    try {
      root = await realpath(distDirectory);
    } catch {
      text(
        res,
        503,
        'The workspace build is missing. Run npm run build before starting this server.',
      );
      return;
    }
    const candidate = resolve(root, `.${pathname}`);
    if (!inside(root, candidate)) {
      text(res, 404, 'Not found.');
      return;
    }
    try {
      let path: string;
      try {
        path = await realpath(candidate);
        if (!inside(root, path) || !(await stat(path)).isFile())
          throw new Error('Not a build file');
      } catch {
        if (extname(pathname) || pathname.startsWith('/assets/')) {
          text(res, 404, 'Not found.');
          return;
        }
        path = await realpath(resolve(root, 'index.html'));
        if (!inside(root, path)) throw new Error('Invalid index');
      }
      const content = await readFile(path);
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME[extname(path)] ?? 'application/octet-stream');
      res.setHeader('Content-Length', content.byteLength);
      res.setHeader(
        'Cache-Control',
        pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      text(res, 404, 'Not found.');
    }
  };
}
