import type { parsePatch } from 'diff'

export type LineType = 'added' | 'removed' | 'hunk' | 'context'

export type DiffLine = {
  type: LineType
  content: string
  oldNum: number | null
  newNum: number | null
}

type Patch = ReturnType<typeof parsePatch>[number]
type ParsedHunkLine = { line: DiffLine; oldNum: number; newNum: number }
type HunkAccumulator = { lines: DiffLine[]; oldNum: number; newNum: number }

const HUNK_SEPARATOR: DiffLine = { type: 'hunk', content: '', oldNum: null, newNum: null }

const parseHunkLine = (line: string, oldNum: number, newNum: number): ParsedHunkLine => {
  if (line.startsWith('+')) {
    return {
      line: { type: 'added', content: line.slice(1), oldNum: null, newNum },
      oldNum,
      newNum: newNum + 1,
    }
  }

  if (line.startsWith('-')) {
    return {
      line: { type: 'removed', content: line.slice(1), oldNum, newNum: null },
      oldNum: oldNum + 1,
      newNum,
    }
  }

  return {
    line: { type: 'context', content: line.slice(1), oldNum, newNum },
    oldNum: oldNum + 1,
    newNum: newNum + 1,
  }
}

export const parseDiffLines = (patch: Patch): DiffLine[] => {
  return patch.hunks.flatMap((hunk, i) => {
    const hasSkippedLines = i > 0 || hunk.oldStart > 1
    const separator = hasSkippedLines ? [HUNK_SEPARATOR] : []

    const { lines } = hunk.lines.reduce<HunkAccumulator>(
      (acc, raw) => {
        const result = parseHunkLine(raw, acc.oldNum, acc.newNum)
        const newLines = [...acc.lines, result.line]
        return { lines: newLines, oldNum: result.oldNum, newNum: result.newNum }
      },
      { lines: [], oldNum: hunk.oldStart, newNum: hunk.newStart },
    )

    return [...separator, ...lines]
  })
}
