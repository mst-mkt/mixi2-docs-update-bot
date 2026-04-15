import { Hono } from 'hono'
import type { Env } from '../..'
import { computeDiff } from '../../diff'
import { summarizeChange } from '../../diff/summarize'

const SAMPLE_OLD = `# サンプル API ガイド (/docs/guides/sample-api)

このガイドでは、サンプル API の使い方を解説します。

主要 API 一覧 [#主要-api-一覧]

| RPC              | 説明                     |
| ---------------- | ------------------------ |
| \`CreateItem\`     | アイテムを作成           |
| \`UploadMedia\`    | メディアアップロード開始 |
| \`GetMediaStatus\` | メディア処理状況を取得   |

アイテムの作成 [#アイテムの作成]

\`CreateItem\` RPC を使用してアイテムを作成します。

アイテム作成の制限 [#アイテム作成の制限]

| 項目               | 制限      |
| ------------------ | --------- |
| テキスト最大文字数 | 200 文字  |
| メディア添付       | 最大 4 件 |

メディアのアップロード [#メディアのアップロード]

アイテムにメディア（画像・動画）を添付するには、以下のフローで処理します。

Step 1: アップロードの開始 [#step-1-アップロードの開始]

\`UploadMedia\` を呼び出して、\`media_id\` と \`upload_url\` を取得します。

Step 2: メディアデータの送信 [#step-2-メディアデータの送信]

取得した \`upload_url\` にデータを POST で送信します。

メディアの制限 [#メディアの制限]

| 項目             | 制限                     |
| ---------------- | ------------------------ |
| 画像最大サイズ   | 10 MB                    |
| 動画最大サイズ   | 50 MB                    |
| 対応フォーマット | JPEG, PNG, GIF, MP4 など |
`

const SAMPLE_NEW = `# サンプル API ガイド (/docs/guides/sample-api)

このガイドでは、サンプル API の使い方を解説します。

主要 API 一覧 [#主要-api-一覧]

| RPC              | 説明                             |
| ---------------- | -------------------------------- |
| \`CreateItem\`     | アイテムを作成（返信/引用対応）  |
| \`DeleteItem\`     | アイテムを削除                   |
| \`SendMessage\`    | メッセージを送信                 |
| \`UploadMedia\`    | メディアアップロード開始         |
| \`GetMediaStatus\` | メディア処理状況を取得           |
| \`GetUsers\`       | ユーザー情報を取得               |

アイテムの作成 [#アイテムの作成]

\`CreateItem\` RPC を使用してアイテムを作成します。

公開範囲の設定 [#公開範囲の設定]

アイテムの公開範囲を制御できます。

| 設定                     | 説明                                     |
| ------------------------ | ---------------------------------------- |
| \`VISIBILITY_PUBLIC\`      | 全ユーザーに公開（デフォルト）           |
| \`VISIBILITY_FOLLOWERS\`   | フォロワーのみに公開                     |
| \`VISIBILITY_PRIVATE\`     | 自分のプロフィールにのみ表示             |

アイテム作成の制限 [#アイテム作成の制限]

| 項目               | 制限                       |
| ------------------ | -------------------------- |
| テキスト最大文字数 | 280 文字                   |
| メディア添付       | 最大 4 件                  |
| メンション数       | 文字数に収まる限り制限なし |

アイテムの削除 [#アイテムの削除]

\`DeleteItem\` RPC を使用して、自身が作成したアイテムを削除します。

<Callout type="warning">削除したアイテムは復元できません。</Callout>

メッセージの送信 [#メッセージの送信]

\`SendMessage\` RPC を使用してメッセージを送信します。

<Callout type="info">先にメッセージを送ることはできません。ユーザーからのメッセージ受信後に返信できます。</Callout>

メディアのアップロード [#メディアのアップロード]

アイテムやメッセージにメディア（画像・動画）を添付するには、以下のフローで処理します。

Step 1: アップロードの開始 [#step-1-アップロードの開始]

\`UploadMedia\` を呼び出して、\`media_id\` と \`upload_url\` を取得します。

Step 2: メディアデータの送信 [#step-2-メディアデータの送信]

取得した \`upload_url\` にデータを POST で送信します。\`Content-Type\` ヘッダーには \`application/octet-stream\` を指定してください。

Step 3: 処理状況の確認 [#step-3-処理状況の確認]

\`GetMediaStatus\` で処理状況を確認します。\`STATUS_COMPLETED\` になるまでポーリングしてください。

| ステータス              | 説明               |
| ----------------------- | ------------------ |
| \`STATUS_UPLOAD_PENDING\` | アップロード待機中 |
| \`STATUS_PROCESSING\`     | 処理中             |
| \`STATUS_COMPLETED\`      | 完了               |
| \`STATUS_FAILED\`         | 失敗               |

メディアの制限 [#メディアの制限]

| 項目                         | 制限                     |
| ---------------------------- | ------------------------ |
| 画像最大サイズ               | 15 MB                    |
| 動画最大サイズ               | 100 MB                   |
| 対応フォーマット             | JPEG, PNG, GIF, MP4 など |
| アップロード有効期限（画像） | 200 秒                   |
| アップロード有効期限（動画） | 600 秒                   |

ユーザー情報の取得 [#ユーザー情報の取得]

\`GetUsers\` RPC を使用して、ユーザー情報を取得できます。
`

const PATH = '/docs/guides/sample-api'

export const summarizeRoute = new Hono<Env>().get('/', async (c) => {
  if (c.env.ENV !== 'development') return c.notFound()

  const oldDocs = new Map([[PATH, SAMPLE_OLD]])
  const newDocs = new Map([[PATH, SAMPLE_NEW]])
  const diff = computeDiff(oldDocs, newDocs)
  const change = diff.changes[0]

  if (change === undefined) return c.json({ error: 'No changes detected' }, 500)

  const summary = await summarizeChange(c.env.AI, change, newDocs, oldDocs)

  return c.json({ path: PATH, type: change.type, summary })
})
