import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { type DocMap, computeDiff, hasChanges } from '../src/diff'
import { formatReplies, formatSummary } from '../src/mixi2/format'

const fixturesDir = resolve(import.meta.dirname, 'fixtures')

const readFixture = (name: string): string => readFileSync(resolve(fixturesDir, name), 'utf-8')

const buildThread = (oldDocs: DocMap, newDocs: DocMap, summaries?: Map<string, string>) => {
  const diff = computeDiff(oldDocs, newDocs)
  const changesWithSummary = diff.changes.map((c) => ({
    ...c,
    summary: summaries?.get(c.path),
  }))
  const diffWithSummary = { changes: changesWithSummary }
  return {
    summary: formatSummary(diffWithSummary),
    replies: formatReplies(diffWithSummary),
    diff,
  }
}

const logThread = (label: string, summary: string, replies: string[]) => {
  console.log(`\n--- ${label} ---`)
  console.log(`[サマリー] ${summary}`)
  for (const [i, reply] of replies.entries()) console.log(`[リプライ${i + 1}] ${reply}`)
}

describe('スレッド生成の統合テスト', () => {
  const gettingStartedOld = readFixture('getting-started.mdx')
  const gettingStartedNew = readFixture('getting-started.modified.mdx')
  const apiReferenceOld = readFixture('api-reference.mdx')
  const apiReferenceNew = readFixture('api-reference.modified.mdx')

  it('変更なし', () => {
    const docs: DocMap = new Map([
      ['/docs/getting-started', gettingStartedOld],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const { diff, replies } = buildThread(docs, docs)

    expect(hasChanges(diff)).toBe(false)
    expect(replies).toHaveLength(0)
  })

  it('1件更新 (AI 要約付き)', () => {
    const old: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const next: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const summaries = new Map([
      [
        '/docs/getting-started',
        'PrerequisitesにDockerを追加、timeoutオプションとDeploymentリンクを追加。',
      ],
    ])
    const { summary, replies, diff } = buildThread(old, next, summaries)

    logThread('1件更新 (AI 要約付き)', summary, replies)

    expect(diff.changes).toHaveLength(1)
    expect(summary).toContain('更新: 1件')
    expect(replies).toHaveLength(1)
    expect(replies[0]).toContain('[更新] /docs/getting-started')
    expect(replies[0]).toContain('Dockerを追加')
  })

  it('2件同時更新 (AI 要約付き)', () => {
    const old: DocMap = new Map([
      ['/docs/getting-started', gettingStartedOld],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const next: DocMap = new Map([
      ['/docs/getting-started', gettingStartedNew],
      ['/docs/api-reference', apiReferenceNew],
    ])
    const summaries = new Map([
      ['/docs/getting-started', 'Docker要件とtimeoutオプションを追加。'],
      ['/docs/api-reference', 'localeパラメータ追加、レート制限変更、403エラー追加。'],
    ])
    const { summary, replies } = buildThread(old, next, summaries)

    logThread('2件同時更新 (AI 要約付き)', summary, replies)

    expect(replies).toHaveLength(2)
    expect(replies[0]).toContain('Docker')
    expect(replies[1]).toContain('locale')
  })

  it('新規ドキュメント追加 + 既存ドキュメント更新', () => {
    const old: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const next: DocMap = new Map([
      ['/docs/getting-started', gettingStartedNew],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const { summary, diff } = buildThread(old, next)

    const types = diff.changes.map((c) => c.type).sort()
    expect(types).toEqual(['added', 'modified'])
    expect(summary).toContain('追加: 1件')
    expect(summary).toContain('更新: 1件')
  })

  it('ドキュメント削除 + 既存ドキュメント更新', () => {
    const old: DocMap = new Map([
      ['/docs/getting-started', gettingStartedOld],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const next: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const { summary, diff } = buildThread(old, next)

    const types = diff.changes.map((c) => c.type).sort()
    expect(types).toEqual(['modified', 'removed'])
    expect(summary).toContain('更新: 1件')
    expect(summary).toContain('削除: 1件')
  })

  it('全投稿が149文字以内 (AI 要約付き)', () => {
    const old: DocMap = new Map([
      ['/docs/getting-started', gettingStartedOld],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const next: DocMap = new Map([
      ['/docs/getting-started', gettingStartedNew],
      ['/docs/api-reference', apiReferenceNew],
    ])
    const summaries = new Map([
      [
        '/docs/getting-started',
        'PrerequisitesにDockerを追加し、Configurationにtimeoutオプションを追加、Next StepsにDeploymentリンクを追加しました。',
      ],
      [
        '/docs/api-reference',
        'helloメソッドにlocaleパラメータを追加し、レートリミットを200/minに変更、403Forbiddenを追加。',
      ],
    ])
    const { summary, replies } = buildThread(old, next, summaries)

    logThread('文字数確認 (AI 要約付き)', summary, replies)
    console.log(`サマリー: ${summary.length}文字`)
    for (const [i, reply] of replies.entries()) console.log(`リプライ${i + 1}: ${reply.length}文字`)

    expect(summary.length).toBeLessThanOrEqual(149)
    for (const reply of replies) {
      expect(reply.length).toBeLessThanOrEqual(149)
    }
  })
})
