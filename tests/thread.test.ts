import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { type DocMap, computeDiff, hasChanges } from '../src/diff'
import { formatReplies, formatSummary } from '../src/format'

const fixturesDir = resolve(import.meta.dirname, 'fixtures')

const readFixture = (name: string): string => readFileSync(resolve(fixturesDir, name), 'utf-8')

const buildThread = (oldDocs: DocMap, newDocs: DocMap) => {
  const diff = computeDiff(oldDocs, newDocs)
  return { summary: formatSummary(diff), replies: formatReplies(diff), diff }
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

    console.log('\n--- 変更なし ---')
    console.log(`changes: ${diff.changes.length}`)

    expect(hasChanges(diff)).toBe(false)
    expect(replies).toHaveLength(0)
  })

  it('1件更新: getting-started に Docker 要件と timeout オプションを追加', () => {
    const old: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const next: DocMap = new Map([['/docs/getting-started', gettingStartedNew]])
    const { summary, replies, diff } = buildThread(old, next)

    logThread('getting-started 更新', summary, replies)

    expect(diff.changes).toHaveLength(1)
    expect(diff.changes[0]?.type).toBe('modified')
    expect(diff.changes[0]?.lineDiff?.added).toBeGreaterThan(0)
    expect(summary).toContain('更新: 1件')
    expect(replies[0]).toContain('[更新] /docs/getting-started')
  })

  it('2件同時更新: getting-started と api-reference の両方が変更', () => {
    const old: DocMap = new Map([
      ['/docs/getting-started', gettingStartedOld],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const next: DocMap = new Map([
      ['/docs/getting-started', gettingStartedNew],
      ['/docs/api-reference', apiReferenceNew],
    ])
    const { summary, replies, diff } = buildThread(old, next)

    logThread('2件同時更新', summary, replies)

    expect(diff.changes).toHaveLength(2)
    expect(diff.changes.every((c) => c.type === 'modified')).toBe(true)
    expect(summary).toContain('更新: 2件')
    expect(replies.length).toBeGreaterThanOrEqual(1)
  })

  it('新規ドキュメント追加 + 既存ドキュメント更新', () => {
    const old: DocMap = new Map([['/docs/getting-started', gettingStartedOld]])
    const next: DocMap = new Map([
      ['/docs/getting-started', gettingStartedNew],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const { summary, replies, diff } = buildThread(old, next)

    logThread('追加 + 更新', summary, replies)

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
    const { summary, replies, diff } = buildThread(old, next)

    logThread('削除 + 更新', summary, replies)

    const types = diff.changes.map((c) => c.type).sort()
    expect(types).toEqual(['modified', 'removed'])
    expect(summary).toContain('更新: 1件')
    expect(summary).toContain('削除: 1件')
  })

  it('全投稿が149文字以内', () => {
    const old: DocMap = new Map([
      ['/docs/getting-started', gettingStartedOld],
      ['/docs/api-reference', apiReferenceOld],
    ])
    const next: DocMap = new Map([
      ['/docs/getting-started', gettingStartedNew],
      ['/docs/api-reference', apiReferenceNew],
    ])
    const { summary, replies } = buildThread(old, next)

    logThread('文字数確認', summary, replies)
    console.log(`サマリー: ${summary.length}文字`)
    for (const [i, reply] of replies.entries()) console.log(`リプライ${i + 1}: ${reply.length}文字`)

    expect(summary.length).toBeLessThanOrEqual(149)
    for (const reply of replies) {
      expect(reply.length).toBeLessThanOrEqual(149)
    }
  })
})
