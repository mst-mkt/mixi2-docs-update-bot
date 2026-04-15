import type { DocChange, DocMap } from '.'

const MODEL = '@cf/google/gemma-4-26b-a4b-it' as keyof AiModels

export type AiClient = Pick<Ai, 'run'>
export type ModelInput = Extract<AiModels[typeof MODEL]['inputs'], { messages: unknown }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const extractContent = (response: unknown): string => {
  if (typeof response === 'string') return response.trim()
  if (!isRecord(response)) return ''
  if (typeof response.response === 'string') return response.response.trim()
  if (!Array.isArray(response.choices)) return ''

  const first: unknown = response.choices[0]
  if (!isRecord(first)) return ''
  if (!isRecord(first.message)) return ''

  return typeof first.message.content === 'string' ? first.message.content.trim() : ''
}

const PROMPT_TEMPLATES: Record<
  DocChange['type'],
  (change: DocChange, newDocs: DocMap, oldDocs: DocMap) => readonly string[]
> = {
  added: (change, newDocs) => [
    `新しいドキュメントが追加されました: ${change.path}`,
    '',
    '--- ドキュメント全文 ---',
    newDocs.get(change.path) ?? '',
  ],
  removed: (change, _, oldDocs) => [
    `ドキュメントが削除されました: ${change.path}`,
    '',
    '--- 削除されたドキュメント全文 ---',
    oldDocs.get(change.path) ?? '',
  ],
  modified: (change, newDocs, oldDocs) => [
    `ドキュメントが更新されました: ${change.path}`,
    '',
    '--- 変更差分 (unified diff) ---',
    change.patch ?? '',
    '',
    '--- 更新前のドキュメント全文 ---',
    oldDocs.get(change.path) ?? '',
    '',
    '--- 更新後のドキュメント全文 ---',
    newDocs.get(change.path) ?? '',
  ],
}

const buildPrompt = (change: DocChange, newDocs: DocMap, oldDocs: DocMap): string =>
  PROMPT_TEMPLATES[change.type](change, newDocs, oldDocs).join('\n')

const SYSTEM_PROMPT = `あなたは開発者向けドキュメントの変更要約を作成するアシスタントです。

## ルール
- 変更内容を日本語で 2 ~ 3 文で要約してください
- 「何が」「どう変わったか」を具体的に書いてください
- 技術用語や API 名はそのまま使用してください
- 「〜が追加された。」「〜に変更された。」のように「だ・である」調で書いてください
- 差分 (unified diff) に含まれる変更のみを要約し、それ以外の内容には言及しないでください

## 良い要約の例
- 「CreatePost の制限にメンション数の項目が追加され、テキスト最大文字数が 150 から 149 文字に変更された。」
- 「メディアアップロードのフローに処理状況のポーリング手順が追加され、 Content-Type の指定方法が明記された。」
- 「Webhook イベントの受信方法に関する新規ガイドが追加された。新規ガイドでは、イベントの種類ごとの処理方法や注意点が説明されている。」

## 制約
100 文字以内に必ず収めてください。`

export const summarizeChange = async (
  ai: AiClient,
  change: DocChange,
  newDocs: DocMap,
  oldDocs: DocMap,
): Promise<string> => {
  const response = await ai.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(change, newDocs, oldDocs) },
    ],
  })

  return extractContent(response)
}
