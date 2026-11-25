// プレビュー用の小さなサーバー。ai-handson フォルダー（この .devcontainer の1つ上）のファイルを http://localhost:3000/ で表示する。
// 開くたびにファイルを読み直すため、ファイルを保存したらプレビューの ↻（更新）で反映される。
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 3000);
const root = fileURLToPath(new URL('..', import.meta.url));

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Method not allowed');
    return;
  }

  let path;
  try {
    path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';

  // ai-handson フォルダーの外と、隠しファイル・隠しフォルダー（.devcontainer、.claude など）は出さない
  const file = normalize(join(root, path));
  const relative = file.slice(root.length);
  if (!file.startsWith(root) || relative.split(sep).some((part) => part.startsWith('.') || part === 'node_modules')) {
    response.writeHead(404).end('Not found');
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`プレビュー: http://localhost:${port}/`);
});
