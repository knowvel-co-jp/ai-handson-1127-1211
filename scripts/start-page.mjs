// キーの確認結果と、プレビューの開き方を載せた START.md を作る。
// キーは後から直されることがあるため、コンテナを開くたび（postStartCommand）に作り直す。
import { writeFile } from 'node:fs/promises';
import { checkKey } from './check-key.mjs';

const key = await checkKey();
const keyLine = {
  ok: key.usable
    ? '**キーの確認：OK**'
    : '**キーの確認：OK**（Claude Code は授業の開始時から使えるようになります）',
  missing: '**キーの確認：キーが登録されていません。** スタッフに声をかけてください。',
  format: '**キーの確認：キーが正しくありません。** スタッフに声をかけてください。',
  invalid: '**キーの確認：キーが正しくありません。** スタッフに声をかけてください。',
  unknown: '**キーの確認：確認できませんでした。** スタッフに声をかけてください。',
}[key.status];
console.log(`キーの確認：${key.status}${key.usable ? '（使用可）' : ''}`);

const page = `# はじめに

${keyLine}

1. 上の「シンプル ブラウザー」のタブに、作っているページのプレビューが表示されます。ファイルを保存したら、↻（更新）を押すと反映されます。
2. 画面右下の「✻ Claude Code」を押すと、右側にClaude Codeが開きます。
3. このページ（START.md）のタブは閉じて構いません。もう一度見たいときは、左の一覧から開けます。

プレビューのタブが見当たらないときは、[ブラウザーでプレビューを開く](http://localhost:3000/)を押してください。
`;

await writeFile(new URL('../START.md', import.meta.url), page);
