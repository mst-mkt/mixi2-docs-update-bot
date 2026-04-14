import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vite-plus/test'
import { type DocMap, computeDiff } from './diff'
import { type AiClient, type ModelInput, summarizeChange } from './summarize'

const fixturesDir = resolve(import.meta.dirname, '../tests/fixtures')
const readFixture = (name: string): string => readFileSync(resolve(fixturesDir, name), 'utf-8')

const createMockAI = (response: string) => ({
  run: vi.fn(() => Promise.resolve({ response })) as unknown as AiClient['run'],
})

const createMockAIChoices = (content: string) => ({
  run: vi.fn(() =>
    Promise.resolve({ choices: [{ message: { content } }] }),
  ) as unknown as AiClient['run'],
})

describe('summarizeChange', () => {
  const gettingStartedOld = readFixture('getting-started.mdx')
  const gettingStartedNew = readFixture('getting-started.modified.mdx')

  it('modified の場合、全文と diff を含むプロンプトを AI に渡す', async () => {
    const oldDocs: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const newDocs: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const diff = computeDiff(oldDocs, newDocs)
    const change = diff.changes[0]
    if (!change) throw new Error('no change detected')

    const mockAI = createMockAI('要約テキスト')
    await summarizeChange(mockAI, change, newDocs, oldDocs)

    const input = vi.mocked(mockAI.run).mock.calls[0]?.[1] as ModelInput
    const userMessage = input.messages.find((m) => m.role === 'user')?.content ?? ''

    expect(userMessage).toContain('/docs/getting-started')
    expect(userMessage).toContain('更新後のドキュメント全文')
    expect(userMessage).toContain('変更差分 (unified diff)')
    expect(userMessage).toContain('Docker')
    expect(userMessage).toContain('timeout')
  })

  it('added の場合、新しいドキュメント全文を含むプロンプトを AI に渡す', async () => {
    const oldDocs: DocMap = new Map()
    const newDocs: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const diff = computeDiff(oldDocs, newDocs)
    const change = diff.changes[0]
    if (!change) throw new Error('no change detected')

    const mockAI = createMockAI('要約テキスト')
    await summarizeChange(mockAI, change, newDocs, oldDocs)

    const input = vi.mocked(mockAI.run).mock.calls[0]?.[1] as ModelInput
    const userMessage = input.messages.find((m) => m.role === 'user')?.content ?? ''

    expect(userMessage).toContain('新しいドキュメントが追加されました')
    expect(userMessage).toContain('ドキュメント全文')
  })

  it('removed の場合、削除されたドキュメント全文を含むプロンプトを AI に渡す', async () => {
    const oldDocs: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const newDocs: DocMap = new Map()
    const diff = computeDiff(oldDocs, newDocs)
    const change = diff.changes[0]
    if (!change) throw new Error('no change detected')

    const mockAI = createMockAI('要約テキスト')
    await summarizeChange(mockAI, change, newDocs, oldDocs)

    const input = vi.mocked(mockAI.run).mock.calls[0]?.[1] as ModelInput
    const userMessage = input.messages.find((m) => m.role === 'user')?.content ?? ''

    expect(userMessage).toContain('ドキュメントが削除されました')
    expect(userMessage).toContain('削除されたドキュメント全文')
  })

  it('response 形式のレスポンスから文字列を取得する', async () => {
    const oldDocs: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const newDocs: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const diff = computeDiff(oldDocs, newDocs)
    const change = diff.changes[0]
    if (!change) throw new Error('no change detected')

    const mockAI = createMockAI('Dockerを追加、timeoutオプションを追加。')
    const result = await summarizeChange(mockAI, change, newDocs, oldDocs)

    expect(result).toBe('Dockerを追加、timeoutオプションを追加。')
  })

  it('choices 形式のレスポンスから文字列を取得する', async () => {
    const oldDocs: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const newDocs: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const diff = computeDiff(oldDocs, newDocs)
    const change = diff.changes[0]
    if (!change) throw new Error('no change detected')

    const mockAI = createMockAIChoices('Dockerを追加、timeoutオプションを追加。')
    const result = await summarizeChange(mockAI, change, newDocs, oldDocs)

    expect(result).toBe('Dockerを追加、timeoutオプションを追加。')
  })
})
