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

ホスティングは **Vercel**（静的 `dist`）。ビルドは `pnpm build`。Cloudflare Pages 用の `wrangler.toml` と workflow は残してあるが、本番の配信先は Vercel。

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

1. タイトルから **巣穴を開く**。ラン開始は **1×1 コア**（メタで初期拡張が付いていれば通路が先に伸びる）。
2. 出せる宝を選ぶ。最初は **銅貨袋**。防衛を重ねると **魔剣 / 呪文書 / 王冠** が開く。
3. マスを押して宝を置き、**誘引する**。侵入は自動進行。記録の色と形で波・削り・足止め・撃退を追う。
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

## Vercel（本番）

ビルドは `pnpm build`、出力ディレクトリは `dist`。`vercel.json` にも同じ値を置いている。

1. [Vercel](https://vercel.com/) で GitHub リポジトリ `nagisora/dungeon-maker` を Import
2. Framework Preset は Vite（未検出なら None）
3. ビルド設定:
   - Install command: `pnpm install`
   - Build command: `pnpm build`
   - Output directory: `dist`
4. Deploy。本番 URL はダッシュボードに出る（プロジェクト名で変わる）

プレビューはブランチ / PR ごとに Vercel が出す。Functions は使わない。静的 `dist` だけを配信する。

## Cloudflare Pages（任意・残置）

`wrangler.toml` と `.github/workflows/pages.yml` は静的 `dist` を出すための名残。本番は Vercel。Pages へも上げたいときだけ使う。

ワークフローは PR ではテストと `pnpm build` だけ。`main` への push でも Cloudflare シークレットが空なら **デプロイはスキップ**する。