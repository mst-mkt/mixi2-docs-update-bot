import type { DiffResult, DocChange } from './diff'

const MAX_POST_LENGTH = 149
const MAX_REPLIES = 9

const TYPE_LABELS: Record<DocChange['type'], string> = {
  added: '追加',
  modified: '更新',
  removed: '削除',
}

const TYPE_SYMBOLS: Record<DocChange['type'], string> = {
  added: '+',
  modified: '~',
  removed: '-',
}

const shortName = (path: string): string => path.split('/').at(-1) ?? path

const formatChangeLine = (change: DocChange): string => {
  const lineDiffInfo = change.lineDiff
    ? ` (+${change.lineDiff.added}/-${change.lineDiff.removed})`
    : ''
  return `[${TYPE_LABELS[change.type]}] ${change.path}${lineDiffInfo}`
}

export const formatSummary = (diff: DiffResult): string => {
  const counts = Object.groupBy(diff.changes, (c) => c.type)

  const parts = [
    counts.added?.length && `追加: ${counts.added.length}件`,
    counts.modified?.length && `更新: ${counts.modified.length}件`,
    counts.removed?.length && `削除: ${counts.removed.length}件`,
  ].filter(Boolean)

  const header = `[mixi2 Docs 更新]\n${parts.join(' / ')}`

  return diff.changes.reduce((text, change) => {
    const line = `\n${TYPE_SYMBOLS[change.type]} ${shortName(change.path)}`
    return text.length + line.length <= MAX_POST_LENGTH ? text + line : text
  }, header)
}

const packReplies = (
  changes: DocChange[],
  replies: string[] = [],
  current: string = '',
): string[] => {
  const head = changes[0]
  if (head === undefined) {
    return current === '' ? replies : [...replies, current]
  }

  if (replies.length >= MAX_REPLIES - 1 && (current !== '' || changes.length > 1)) {
    const omitted = changes.length + (current !== '' ? 1 : 0)
    return [
      ...replies,
      ...(current !== '' ? [current] : []),
      `他 ${omitted - 1}件の変更があります`,
    ].slice(0, MAX_REPLIES)
  }

  const rest = changes.slice(1)
  const line = formatChangeLine(head)

  if (current === '') {
    return packReplies(rest, replies, line)
  }

  const candidate = `${current}\n${line}`
  if (candidate.length <= MAX_POST_LENGTH) {
    return packReplies(rest, replies, candidate)
  }

  return packReplies(changes, [...replies, current], '')
}

export const formatReplies = (diff: DiffResult): string[] => packReplies(diff.changes)
