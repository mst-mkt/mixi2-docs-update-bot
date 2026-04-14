import { describe, expect, it } from 'vite-plus/test'
import type { DiffResult, DocChange } from '../diff'
import { formatReplies, formatSummary } from './format'

const change = (
  path: string,
  type: DocChange['type'],
  opts?: { lineDiff?: { added: number; removed: number }; summary?: string },
): DocChange => ({ path, type, lineDiff: opts?.lineDiff, summary: opts?.summary })

const diff = (...changes: DocChange[]): DiffResult => ({ changes })

describe('formatSummary', () => {
  it('追加のみの場合', () => {
    const result = formatSummary(diff(change('/docs/a', 'added')))
    expect(result).toContain('[ドキュメント更新]')
    expect(result).toContain('追加: 1件')
    expect(result).not.toContain('更新:')
    expect(result).not.toContain('削除:')
  })

  it('更新のみの場合', () => {
    const result = formatSummary(diff(change('/docs/a', 'modified')))
    expect(result).toContain('更新: 1件')
  })

  it('削除のみの場合', () => {
    const result = formatSummary(diff(change('/docs/a', 'removed')))
    expect(result).toContain('削除: 1件')
  })

  it('混在する場合にすべての件数を含む', () => {
    const result = formatSummary(
      diff(change('/docs/a', 'added'), change('/docs/b', 'modified'), change('/docs/c', 'removed')),
    )
    expect(result).toContain('追加: 1件')
    expect(result).toContain('更新: 1件')
    expect(result).toContain('削除: 1件')
  })

  it('変更種別に応じたシンボルで短縮名が含まれる', () => {
    const result = formatSummary(
      diff(
        change('/docs/guides/client', 'added'),
        change('/docs/b', 'modified'),
        change('/docs/c', 'removed'),
      ),
    )
    expect(result).toContain('🆕 client')
    expect(result).toContain('📝 b')
    expect(result).toContain('❌ c')
  })

  it('149文字を超えない', () => {
    const changes = Array.from({ length: 50 }, (_, i) =>
      change(`/docs/very-long-document-name-${i}`, 'modified'),
    )
    const result = formatSummary(diff(...changes))
    expect(result.length).toBeLessThanOrEqual(149)
  })
})

describe('formatReplies', () => {
  it('1件の変更で1つのリプライを返す', () => {
    const replies = formatReplies(diff(change('/docs/a', 'added')))
    expect(replies).toHaveLength(1)
    expect(replies[0]).toContain('[追加] /docs/a')
  })

  it('lineDiff 情報が含まれる', () => {
    const replies = formatReplies(
      diff(change('/docs/a', 'modified', { lineDiff: { added: 3, removed: 1 } })),
    )
    expect(replies[0]).toContain('(+3 / -1)')
  })

  it('AI 要約がリプライに含まれる', () => {
    const replies = formatReplies(
      diff(change('/docs/a', 'modified', { summary: 'Dockerを追加しました。' })),
    )
    expect(replies[0]).toContain('[更新] /docs/a')
    expect(replies[0]).toContain('Dockerを追加しました。')
  })

  it('追加・更新のリプライにドキュメントリンクが含まれる', () => {
    const replies = formatReplies(diff(change('/docs/a', 'added')))
    expect(replies[0]).toContain('docs: https://developer.mixi.social/docs/a')
  })

  it('削除のリプライにはドキュメントリンクが含まれない', () => {
    const replies = formatReplies(diff(change('/docs/a', 'removed')))
    expect(replies[0]).not.toContain('docs:')
  })

  it('AI 要約が149文字を超える場合は切り詰められる', () => {
    const longSummary = 'あ'.repeat(200)
    const replies = formatReplies(diff(change('/docs/a', 'modified', { summary: longSummary })))
    expect(replies[0]?.length).toBeLessThanOrEqual(149)
    expect(replies[0]).toContain('...')
  })

  it('各変更が個別のリプライになる', () => {
    const replies = formatReplies(
      diff(
        change('/docs/a', 'added', { summary: '新規ガイド追加' }),
        change('/docs/b', 'modified', { summary: '設定変更' }),
      ),
    )
    expect(replies).toHaveLength(2)
    expect(replies[0]).toContain('/docs/a')
    expect(replies[1]).toContain('/docs/b')
  })

  it('最大9件のリプライで省略メッセージが含まれる', () => {
    const changes = Array.from({ length: 15 }, (_, i) =>
      change(`/docs/page-${i}`, 'modified', { summary: `変更${i}` }),
    )
    const replies = formatReplies(diff(...changes))
    expect(replies.length).toBeLessThanOrEqual(9)
    expect(replies.at(-1)).toMatch(/他 \d+ 件の変更があります/)
  })

  it('パスが非常に長い場合でも149文字を超えない', () => {
    const longPath = `/docs/${'a'.repeat(200)}`
    const replies = formatReplies(diff(change(longPath, 'modified', { summary: '変更内容' })))
    expect(replies[0]?.length).toBeLessThanOrEqual(149)
  })

  it('変更なしの場合は空配列', () => {
    expect(formatReplies(diff())).toEqual([])
  })
})
