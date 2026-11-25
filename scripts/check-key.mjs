// 登録されたキー（ANTHROPIC_AUTH_TOKEN。Windowsのユーザー環境変数から渡す）が、OpenRouterで使えるキーかを確かめる。
// OpenRouterのキーの情報を取得するだけ（GET /api/v1/key）で、AIのモデルは呼ばないため費用はかからない。
// 使える金額の上限に達しているキーでも確認できる。
// キーの値は画面にもファイルにも出さない。

const ENDPOINT = 'https://openrouter.ai/api/v1/key';

/** @returns {Promise<{ status: 'ok' | 'missing' | 'format' | 'invalid' | 'unknown', usable?: boolean }>} */
export async function checkKey(key = process.env.ANTHROPIC_AUTH_TOKEN) {
  if (!key) return { status: 'missing' };
  if (!/^sk-or-v1-[0-9a-f]{64}$/.test(key)) return { status: 'format' };

  try {
    const res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) return { status: 'invalid' };
    if (!res.ok) return { status: 'unknown' };
    const { data } = await res.json();
    // limit が null（上限なし）か、残りがあれば、今すぐClaude Codeを使える。
    const usable = data?.limit == null || (data?.limit_remaining ?? 0) > 0;
    return { status: 'ok', usable };
  } catch {
    return { status: 'unknown' };
  }
}

// コンテナの起動時（postStartCommand）と、スタッフが確かめたいとき（node scripts/check-key.mjs）に結果を表示する。
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await checkKey();
  const message = {
    ok: result.usable ? 'OK' : 'OK（ただし今は上限額に達していて、Claude Code は使えない）',
    missing: 'キーが登録されていない（Windows の環境変数 ANTHROPIC_AUTH_TOKEN が VS Code に渡っていない）',
    format: 'キーの形式が違う（sk-or-v1- で始まる OpenRouter のキーではない）',
    invalid: 'OpenRouter に断られた（キーが無効化・削除されている、または値が違う）',
    unknown: '確認できなかった（通信の状態を確かめる）',
  }[result.status];
  console.log(`キーの確認：${message}`);
}
