// プレビュー用の小さなサーバー。ai-handson フォルダー（この .devcontainer の1つ上）のファイルを http://localhost:3000/ で表示する。
// ファイルが変わると、開いているページを自動で再読み込みする（HTML を返すときに、そのための短いスクリプトを末尾に足す。ファイルそのものは変えない）。
import { readdir, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 3000);
const root = fileURLToPath(new URL('..', import.meta.url)); // 末尾に / が付く

const types = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

// 出さないもの・見張らないもの：隠しファイル・隠しフォルダー（.devcontainer、.claude など）と、
// Claude Code がライブラリを入れたときにできる、ファイルの多いフォルダー
const ignored = (part) => part.startsWith('.') || ['node_modules', 'venv', '__pycache__'].includes(part);

// ---- 自動の再読み込み ----
// 開いているページは /__reload につないで待ち、ファイルが変わったら知らせを受けて再読み込みする。
// Windows のフォルダーをつないだ環境では変更の通知が届かないことがあるため、1秒ごとにファイルの大きさと時刻を見比べる。
const reloadPath = '/__reload';
const reloadScript = `<script>new EventSource('${reloadPath}').onmessage = () => location.reload();</script>`;
const clients = new Set();

async function snapshot(dir = root) {
  let result = '';
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored(entry.name)) continue;
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

let last = await snapshot().catch(() => null);
let checking = false;
setInterval(async () => {
  if (checking) return;
  checking = true;
  try {
    const now = await snapshot();
    if (last !== null && now !== last) {
      for (const client of clients) client.write('data: reload\n\n');
    }
    last = now;
  } catch {
    // 途中でファイルが消えたときなどは、次の回に見直す
  } finally {
    checking = false;
  }
}, 1000);

// つないだままのページに、30秒ごとに空の知らせを送る（間の転送で、つながりが切られないように）
setInterval(() => {
  for (const client of clients) client.write(': ping\n\n');
}, 30_000);

// HTML の </body> の直前（なければ末尾）に、再読み込みのスクリプトを足す。
// latin1 で読むと1バイトが1文字になるため、文字コードが何であっても中身を壊さない。
function withReload(body) {
  const html = body.toString('latin1');
  const matches = [...html.matchAll(/<\/body\s*>/gi)];
  const at = matches.length ? matches[matches.length - 1].index : html.length;
  return Buffer.from(html.slice(0, at) + reloadScript + html.slice(at), 'latin1');
}

createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Method not allowed');
    return;
  }

  let url;
  let path;
  try {
    url = new URL(request.url ?? '/', 'http://localhost');
    path = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (path === reloadPath && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
    response.write(': connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  if (path.endsWith('/')) path += 'index.html';

  // ai-handson フォルダーの外と、出さないもの（上の ignored）は 404 にする
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || file.slice(root.length).split(sep).some(ignored)) {
    response.writeHead(404).end('Not found');
    return;
  }

  try {
    if ((await stat(file)).isDirectory()) {
      // フォルダーを / なしで開いたときは、/ を付けたアドレスに案内する（中の index.html を出す）
      response.writeHead(302, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }
    let body = await readFile(file);
    const type = types[extname(file).toLowerCase()] ?? 'application/octet-stream';
    if (type.startsWith('text/html')) body = withReload(body);
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`プレビュー: http://localhost:${port}/`);
});
