# AIハンズオン 11/27・12/11

KnowvelのWindows PC 10台で、Dev Container（WSL2＋Docker Desktop）の中でClaude Codeを使う授業用の環境です。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `index.html` | プレビューの最初のページ。同じフォルダーに置いたHTMLは `http://localhost:3000/ファイル名` で見られます |
| `server.mjs` | プレビューを表示するための小さなサーバー |
| `setup/configure-pc.ps1` | PCごとの下準備（スリープ停止・VS Codeの設定・キーの登録） |

## PCの準備（スタッフ用）

1. WSL2、Docker Desktop、VS Code、Git for Windows を入れる（版は1台目にそろえる）。
2. このリポジトリを取り出す。
   ```powershell
   cd $HOME
   git clone https://github.com/knowvel-co-jp/ai-handson-1127-1211.git ai-handson
   ```
3. 管理者のPowerShellで下準備を実行し、そのPC用のOpenRouterのキーを貼る。
   ```powershell
   cd $HOME\ai-handson
   powershell -ExecutionPolicy Bypass -File setup\configure-pc.ps1
   ```
4. VS Code をすべて閉じてから開き直し、`ai-handson` フォルダーを開いて「Reopen in Container」。
5. Claude Code のパネルを開き、「Trust this folder」の確認が出たら信頼する。短い指示を1つ送って、返事が来ることと、プレビュー（Ports タブの「プレビュー」→ Preview in Editor）に反映されることを確かめる。

キーを差し替えたら、手順3をもう一度実行し、VS Code をすべて閉じてから開き直す（コンテナの作り直しは要らない）。
