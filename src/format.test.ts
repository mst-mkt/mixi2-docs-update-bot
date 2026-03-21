import { describe, expect, it } from 'vite-plus/test'
import type { DiffResult, DocChange } from './diff'
import { formatReplies, formatSummary } from './format'

const change = (
  path: string,
  type: DocChange['type'],
  lineDiff?: { added: number; removed: number },
): DocChange => ({ path, type, lineDiff })

const diff = (...changes: DocChange[]): DiffResult => ({ changes })

describe('formatSummary', () => {
  it('追加のみの場合', () => {
    const result = formatSummary(diff(change('/docs/a', 'added')))
    expect(result).toContain('[mixi2 Docs 更新]')
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
    expect(result).toContain('+ client')
    expect(result).toContain('~ b')
    expect(result).toContain('- c')
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
    const replies = formatReplies(diff(change('/docs/a', 'modified', { added: 3, removed: 1 })))
    expect(replies[0]).toContain('(+3/-1)')
  })

  it('149文字に収まる複数ファイルは1リプライにまとまる', () => {
    const replies = formatReplies(diff(change('/docs/a', 'added'), change('/docs/b', 'added')))
    expect(replies).toHaveLength(1)
    expect(replies[0]).toContain('/docs/a')
    expect(replies[0]).toContain('/docs/b')
  })

  it('149文字を超える場合は複数リプライに分割され各リプライが149文字以内', () => {
    const changes = Array.from({ length: 20 }, (_, i) =>
      change(`/docs/section/page-${i}`, 'modified', { added: i, removed: i }),
    )
    const replies = formatReplies(diff(...changes))
    expect(replies.length).toBeGreaterThan(1)
    for (const reply of replies) {
      expect(reply.length).toBeLessThanOrEqual(149)
    }
  })

  it('最大9件のリプライで省略メッセージが含まれる', () => {
    const changes = Array.from({ length: 50 }, (_, i) =>
      change(`/docs/guides/very-long-document-name-number-${i}`, 'modified', {
        added: 100,
        removed: 50,
      }),
    )
    const replies = formatReplies(diff(...changes))
    expect(replies.length).toBeLessThanOrEqual(9)
    expect(replies.at(-1)).toMatch(/他 \d+件の変更があります/)
  })

  it('変更なしの場合は空配列', () => {
    expect(formatReplies(diff())).toEqual([])
  })
})
