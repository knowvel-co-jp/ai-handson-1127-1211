// プレビュー用の小さなサーバー。ai-handson フォルダー（この .devcontainer の1つ上）のファイルを http://localhost:3000/ で表示する。
// ファイルが変わると、開いているページを自動で再読み込みする（HTML を返すときに、そのための短いスクリプトを末尾に足す。ファイルそのものは変えない）。
import { readdir, readFile, stat } from 'node:fs/promises';
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

const hidden = (part) => part.startsWith('.') || part === 'node_modules';

// 自動の再読み込み。開いているページは /__reload につないで待ち、ファイルが変わったら知らせる。
// Windows のフォルダーをつないだ環境では変更の通知が届かないことがあるため、1秒ごとにファイルの大きさと時刻を見比べる。
const reloadPath = '/__reload';
const reloadScript = `<script>new EventSource('${reloadPath}').onmessage = () => location.reload();</script>`;
const clients = new Set();

async function snapshot(dir = root) {
  let result = '';
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (hidden(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      result += await snapshot(full);
    } else {
      const info = await stat(full);
      result += `${full}:${info.size}:${info.mtimeMs}\n`;
    }
  }
  return result;
}

let last = await snapshot().catch(() => '');
let checking = false;
setInterval(async () => {
  if (checking) return;
  checking = true;
  try {
    const now = await snapshot();
    if (now !== last) {
      last = now;
      for (const client of clients) client.write('data: reload\n\n');
    }
  } catch {
    // 途中でファイルが消えたときなどは、次の回に見直す
  } finally {
    checking = false;
  }
}, 1000);

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

  if (path === reloadPath) {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
    response.write(': connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  if (path.endsWith('/')) path += 'index.html';

  // ai-handson フォルダーの外と、隠しファイル・隠しフォルダー（.devcontainer、.claude など）は出さない
  const file = normalize(join(root, path));
  const relative = file.slice(root.length);
  if (!file.startsWith(root) || relative.split(sep).some(hidden)) {
    response.writeHead(404).end('Not found');
    return;
  }

  try {
    let body = await readFile(file);
    const type = types[extname(file).toLowerCase()] ?? 'application/octet-stream';
    if (type.startsWith('text/html')) {
      const html = body.toString('utf8');
      const at = html.toLowerCase().lastIndexOf('</body>');
      body = Buffer.from(at === -1 ? html + reloadScript : html.slice(0, at) + reloadScript + html.slice(at));
    }
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`プレビュー: http://localhost:${port}/`);
});
