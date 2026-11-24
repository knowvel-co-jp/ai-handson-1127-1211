// Claude Code の「Trust this folder in Claude Code?」の確認を出さないよう、
// このフォルダーを信頼済みとして ~/.claude.json に書き込む（コンテナの作成時に1回）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const file = join(homedir(), '.claude.json');
const folder = process.cwd();

let config = {};
if (existsSync(file)) {
  try {
    config = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    config = {};
  }
}
config.projects ??= {};
config.projects[folder] = { ...config.projects[folder], hasTrustDialogAccepted: true };
writeFileSync(file, JSON.stringify(config, null, 2));
console.log(`Claude Code: ${folder} を信頼済みにした`);
