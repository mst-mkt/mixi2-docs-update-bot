import type { DocChange, DocMap } from './diff'

const MODEL = '@cf/qwen/qwen3-30b-a3b-fp8'

type Message = { role: 'system' | 'user'; content: string }

export type AiClient = {
  run(this: void, model: string, input: { messages: Message[] }): Promise<unknown>
}

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
    '--- ドキュメント全文 ---',
    newDocs.get(change.path) ?? '',
  ],
  removed: (change, _, oldDocs) => [
    `ドキュメントが削除されました: ${change.path}`,
    '--- 削除されたドキュメント全文 ---',
    oldDocs.get(change.path) ?? '',
  ],
  modified: (change, newDocs) => [
    `ドキュメントが更新されました: ${change.path}`,
    '--- 更新後のドキュメント全文 ---',
    newDocs.get(change.path) ?? '',
    '--- 変更差分 (unified diff) ---',
    change.patch ?? '',
  ],
}

const buildPrompt = (change: DocChange, newDocs: DocMap, oldDocs: DocMap): string =>
  PROMPT_TEMPLATES[change.type](change, newDocs, oldDocs).join('\n')

const SYSTEM_PROMPT = [
  'あなたはドキュメント変更の要約を作成するアシスタントです。',
  '以下のルールに従ってください:',
  '- 変更内容を日本語で簡潔に要約してください',
  '- 1〜2文で、何がどう変わったかを説明してください',
  '- 技術用語はそのまま使用してください',
  '- 120文字以内に収めてください',
  '/no_think',
].join('\n')

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
