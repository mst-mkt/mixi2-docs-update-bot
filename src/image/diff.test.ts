import { describe, expect, it } from 'vite-plus/test'
import { createPatch, parsePatch } from 'diff'
import { parseDiffLines } from './diff'

const makePatch = (oldStr: string, newStr: string) => {
  const patches = parsePatch(createPatch('file', oldStr, newStr))
  const patch = patches.at(0)
  if (patch === undefined) throw new Error('Failed to parse patch')
  return patch
}

describe('parseDiffLines', () => {
  it('追加のみの場合は added 行を返す', () => {
    const patch = makePatch('', 'line1\nline2\n')
    const lines = parseDiffLines(patch)

    const added = lines.filter((l) => l.type === 'added')
    expect(added).toHaveLength(2)
    expect(added[0]?.content).toBe('line1')
    expect(added[1]?.content).toBe('line2')
  })

  it('削除のみの場合は removed 行を返す', () => {
    const patch = makePatch('line1\nline2\n', '')
    const lines = parseDiffLines(patch)

    const removed = lines.filter((l) => l.type === 'removed')
    expect(removed).toHaveLength(2)
    expect(removed[0]?.content).toBe('line1')
    expect(removed[1]?.content).toBe('line2')
  })

  it('変更がある場合は context, added, removed 行を含む', () => {
    const patch = makePatch('keep\nold\n', 'keep\nnew\n')
    const lines = parseDiffLines(patch)

    const types = new Set(lines.map((l) => l.type))
    expect(types.has('context')).toBe(true)
    expect(types.has('added')).toBe(true)
    expect(types.has('removed')).toBe(true)
  })

  it('added 行の oldNum は null になる', () => {
    const patch = makePatch('', 'line1\n')
    const lines = parseDiffLines(patch)

    const added = lines.find((l) => l.type === 'added')
    expect(added?.oldNum).toBeNull()
    expect(added?.newNum).toBe(1)
  })

  it('removed 行の newNum は null になる', () => {
    const patch = makePatch('line1\n', '')
    const lines = parseDiffLines(patch)

    const removed = lines.find((l) => l.type === 'removed')
    expect(removed?.oldNum).toBe(1)
    expect(removed?.newNum).toBeNull()
  })

  it('context 行は oldNum と newNum の両方を持つ', () => {
    const patch = makePatch('keep\nold\n', 'keep\nnew\n')
    const lines = parseDiffLines(patch)

    const context = lines.find((l) => l.type === 'context')
    expect(context?.oldNum).toBeTypeOf('number')
    expect(context?.newNum).toBeTypeOf('number')
  })

  it('離れた変更がある場合は hunk セパレータを含む', () => {
    const oldLines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join('\n')
    const newLines = oldLines.replace('line1', 'changed1').replace('line20', 'changed20')

    const patch = makePatch(oldLines, newLines)
    const lines = parseDiffLines(patch)

    const hunks = lines.filter((l) => l.type === 'hunk')
    expect(hunks.length).toBeGreaterThanOrEqual(1)
    expect(hunks[0]?.content).toBe('')
    expect(hunks[0]?.oldNum).toBeNull()
    expect(hunks[0]?.newNum).toBeNull()
  })

  it('行番号が連続して正しくインクリメントされる', () => {
    const patch = makePatch('a\nb\nc\n', 'a\nB\nc\n')
    const lines = parseDiffLines(patch)

    const nonHunk = lines.filter((l) => l.type !== 'hunk')
    const oldNums = nonHunk.map((l) => l.oldNum).filter((n) => n !== null)
    const newNums = nonHunk.map((l) => l.newNum).filter((n) => n !== null)

    for (let i = 1; i < oldNums.length; i++) {
      expect(oldNums[i]).toBe(oldNums[i - 1]! + 1)
    }
    for (let i = 1; i < newNums.length; i++) {
      expect(newNums[i]).toBe(newNums[i - 1]! + 1)
    }
  })

  it('ファイル先頭からの変更では hunk セパレータを含まない', () => {
    const patch = makePatch('old\n', 'new\n')
    const lines = parseDiffLines(patch)

    expect(lines.filter((l) => l.type === 'hunk')).toHaveLength(0)
  })
})
