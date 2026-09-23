# ダンジョンメーカー風フォロワー

> **非公式 / ファン作品**  
> 『ダンジョンメーカー』に着想を得た、ファンによる薄いフォロワー（fan MVP）です。  
> 商標および原作の知的財産は、原作の権利者に帰属します。  
> 公式製品ではなく、原作者・発売元との提携・後援・許諾はありません。

プレイヤーがダンジョン側の、薄いブラウザファン MVP（v1 / v2）。宝を置いて侵入を迎え、落とし物で巣穴を整える。周回のあいだに解放が残る。道中イベントやノードマップはない。

MIT ライセンス（既存の `LICENSE` を維持）。

## 配信形態（固定）

**通常のブラウザで開く単ページ Web アプリ** だけ。状態の薄い永続化は `localStorage`。

入れない: Capacitor / Electron / React Native / Flutter / Tauri / その他のネイティブ・モバイル殻。

ホスティングは **Cloudflare Pages**（静的 `dist`）。Vercel 設定は置かない。

## ローカル起動

[pnpm](https://pnpm.io/) を使う。

```bash
pnpm install
pnpm dev
```

ブラウザで表示された URL（既定は http://localhost:5173 ）を開く。

静的ビルド:

```bash
pnpm build
pnpm preview
```

ロジック確認:

```bash
pnpm test
```

## 遊び方（v1）

1. ラン開始は **1×1 コア**（メタで初期拡張が付いていれば通路が先に伸びる）。
2. 出せる宝を選ぶ。最初は **銅貨袋**。防衛を重ねると **魔剣 / 呪文書 / 王冠** が開く。
3. マスをクリックして宝を置き、**誘引する**。侵入は自動進行。ログの色で波・削り・足止め・撃退を追う。
4. 守り切ったら落とし物を1つ置く。
   - **通路** — 隣接マスを広げ、歩数で消耗（巣穴はおよそ **5×5** まで）
   - **削り罠** — 踏んだ侵入者の体力を削る
   - **足止め罠** — 一拍留めてもう一度削る
   - **配下** — 番人。追加ダメージ（罠と重ねられる）
5. 宝の種類で侵入者が変わる。
   - 銅貨袋 → 弱い盗賊
   - 魔剣 → 厚い戦士（通路と削りが欲しい）
   - 呪文書 → 魔法使い（罠を解きがち）
   - 王冠 → 精鋭パーティ（高圧）
6. **王冠を守り切る**か **第6波まで持つ**と周回クリア。失敗時は理由が表示され、**即再挑戦**できる。

## メタ（v2）

ランの外に薄いメタ画面がある。ガチャ・スタミナ・マルチはない。

`localStorage` キー `dungeon-maker-v2-meta`（旧 `dungeon-maker-v0-meta` は読み込んで移行する）。

失敗しても見識が少し増える。防衛成功と見識で次が開く。

| 条件 | 解放 |
| --- | --- |
| 防衛成功 1 または見識 2 | 魔剣、足止め罠 |
| 防衛成功 2 または見識 5 | 呪文書、配下、初期拡張 +1 |
| 防衛成功 4 または見識 8 | 王冠 |
| 防衛成功 5 | 初期拡張 +2 |

同じブラウザなら次のラン開始時に宝・パーツ・初期通路が残る。

## Cloudflare Pages

ビルドは `pnpm build`、出力ディレクトリは `dist`。設定ファイルは `wrangler.toml`（`pages_build_output_dir = "dist"`）。

本番 URL は接続後にダッシュボードへ出る。プロジェクト名を `dungeon-maker` にした場合の例:

`https://dungeon-maker.pages.dev`

（アカウント／プロジェクト名で変わる。プレビューは `https://<branch>.<project>.pages.dev`。）

### A. ダッシュボードで Git 接続（トークン不要・推奨）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. リポジトリ `nagisora/dungeon-maker` を選ぶ
3. ビルド設定:
   - Production branch: `main`
   - Framework preset: Vite（または None）
   - Build command: `pnpm build`
   - Build output directory: `dist`
4. Save and Deploy。完了後に `*.pages.dev` URL が表示される

### B. GitHub Actions で Direct Upload

ワークフローは `.github/workflows/pages.yml`。PR ではテストと `pnpm build` だけ。`main` への push でもシークレットが空なら **デプロイはスキップ**する（トークンを捏造しない）。

1. Cloudflare → [API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) → **Create Token**
2. Custom Token。Permissions: **Account** / **Cloudflare Pages** / **Edit**
3. Account ID はダッシュボード右欄の **Account ID**（Workers & Pages 概要でも可）
4. GitHub リポジトリ → **Settings** → **Secrets and variables** → **Actions** → New repository secret を2つ:
   - `CLOUDFLARE_API_TOKEN` — 上で作ったトークン
   - `CLOUDFLARE_ACCOUNT_ID` — アカウント ID
5. `main` へ push（または Actions の workflow_dispatch）
6. 初回は Cloudflare 側に Pages プロジェクト `dungeon-maker` が無ければ、ダッシュボードで同名プロジェクトを先に作るか、最初の `wrangler pages deploy` が作成する
7. デプロイログとダッシュボードに本番 URL が出る

手元から送る場合（トークンは環境変数。リポジトリに書かない）:

```bash
pnpm build
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
  pnpm dlx wrangler pages deploy dist --project-name=dungeon-maker
```
