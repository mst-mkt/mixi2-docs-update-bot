import { describe, expect, it } from 'vite-plus/test'
import { type DocMap, computeDiff, hasChanges } from './diff'

const map = (...entries: [string, string][]): DocMap => new Map(entries)

describe('computeDiff', () => {
  it('変更なしの場合は空の changes を返す', () => {
    const old = map(['/docs/a', 'content a'])
    const next = map(['/docs/a', 'content a'])
    const result = computeDiff(old, next)

    expect(result.changes).toEqual([])
  })

  it('新規ドキュメントを added として検出する', () => {
    const old = map()
    const next = map(['/docs/a', 'content a'])
    const result = computeDiff(old, next)

    expect(result.changes).toEqual([{ path: '/docs/a', type: 'added' }])
  })

  it('削除されたドキュメントを removed として検出する', () => {
    const old = map(['/docs/a', 'content a'])
    const next = map()
    const result = computeDiff(old, next)

    expect(result.changes).toEqual([{ path: '/docs/a', type: 'removed' }])
  })

  it('内容が変わったドキュメントを modified として検出し lineDiff を含む', () => {
    const old = map(['/docs/a', 'line1\nline2\n'])
    const next = map(['/docs/a', 'line1\nline2\nline3\n'])
    const result = computeDiff(old, next)

    expect(result.changes).toHaveLength(1)
    expect(result.changes[0]?.type).toBe('modified')
    expect(result.changes[0]?.lineDiff).toEqual({ added: 1, removed: 0 })
  })

  it('行の削除を lineDiff で検出する', () => {
    const old = map(['/docs/a', 'line1\nline2\nline3\n'])
    const next = map(['/docs/a', 'line1\n'])
    const result = computeDiff(old, next)

    expect(result.changes[0]?.lineDiff).toEqual({ added: 0, removed: 2 })
  })

  it('行の変更を lineDiff で追加と削除の両方として検出する', () => {
    const old = map(['/docs/a', 'old line\n'])
    const next = map(['/docs/a', 'new line\n'])
    const result = computeDiff(old, next)

    expect(result.changes[0]?.lineDiff).toEqual({ added: 1, removed: 1 })
  })

  it('追加・更新・削除が混在する場合にすべて検出する', () => {
    const old = map(['/docs/a', 'old'], ['/docs/b', 'keep'], ['/docs/c', 'gone'])
    const next = map(['/docs/a', 'new'], ['/docs/b', 'keep'], ['/docs/d', 'fresh'])
    const result = computeDiff(old, next)

    const types = result.changes.map((c) => c.type).sort()
    expect(types).toEqual(['added', 'modified', 'removed'])

    expect(result.changes.find((c) => c.type === 'added')?.path).toBe('/docs/d')
    expect(result.changes.find((c) => c.type === 'modified')?.path).toBe('/docs/a')
    expect(result.changes.find((c) => c.type === 'removed')?.path).toBe('/docs/c')
  })

  it('両方空の場合は変更なし', () => {
    const result = computeDiff(map(), map())
    expect(result.changes).toEqual([])
  })

  it('added には lineDiff が含まれない', () => {
    const result = computeDiff(map(), map(['/docs/a', 'content']))
    expect(result.changes[0]?.lineDiff).toBeUndefined()
  })

  it('removed には lineDiff が含まれない', () => {
    const result = computeDiff(map(['/docs/a', 'content']), map())
    expect(result.changes[0]?.lineDiff).toBeUndefined()
  })
})

describe('hasChanges', () => {
  it('changes が空なら false', () => {
    expect(hasChanges({ changes: [] })).toBe(false)
  })

  it('changes があれば true', () => {
    expect(hasChanges({ changes: [{ path: '/docs/a', type: 'added' }] })).toBe(true)
  })
})
