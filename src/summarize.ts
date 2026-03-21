import type { DocChange, DocMap } from './diff'

const MODEL = '@cf/qwen/qwen3-30b-a3b-fp8'

type Message = { role: 'system' | 'user'; content: string }

export type AiClient = {
  run(this: void, model: string, input: { messages: Message[] }): Promise<unknown>
}

const extractContent = (response: unknown): string => {
  if (typeof response === 'string') return response.trim()
  if (typeof response !== 'object' || response === null) return ''

  const obj = response as Record<string, unknown>

  if (typeof obj.response === 'string') return obj.response.trim()

  const choices = obj.choices
  if (!Array.isArray(choices)) return ''

  const message = (choices[0] as Record<string, unknown> | undefined)?.message
  if (typeof message !== 'object' || message === null) return ''

  const content = (message as Record<string, unknown>).content
  if (typeof content !== 'string') return ''

  return content.trim()
}

const buildPrompt = (change: DocChange, newDocs: DocMap, oldDocs: DocMap): string => {
  const parts: string[] = []

  if (change.type === 'added') {
    parts.push(`新しいドキュメントが追加されました: ${change.path}`)
    parts.push('--- ドキュメント全文 ---')
    parts.push(newDocs.get(change.path) ?? '')
  }

  if (change.type === 'removed') {
    parts.push(`ドキュメントが削除されました: ${change.path}`)
    parts.push('--- 削除されたドキュメント全文 ---')
    parts.push(oldDocs.get(change.path) ?? '')
  }

  if (change.type === 'modified') {
    parts.push(`ドキュメントが更新されました: ${change.path}`)
    parts.push('--- 更新後のドキュメント全文 ---')
    parts.push(newDocs.get(change.path) ?? '')
    parts.push('--- 変更差分 (unified diff) ---')
    parts.push(change.patch ?? '')
  }

  return parts.join('\n')
}

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
