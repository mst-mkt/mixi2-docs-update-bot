import type { DiffResult, DocChange } from '../diff'
import { DOC_TOP_URL } from '../docs'

const MAX_POST_LENGTH = 149
const MAX_REPLIES = 9

const TYPE_LABELS: Record<DocChange['type'], string> = {
  added: '追加',
  modified: '更新',
  removed: '削除',
}

const TYPE_SYMBOLS: Record<DocChange['type'], string> = {
  added: '🆕',
  modified: '📝',
  removed: '❌',
}

const shortName = (path: string): string => path.split('/').at(-1) ?? path

const formatChangeLine = (change: DocChange): string => {
  const lineDiffInfo =
    change.lineDiff !== undefined ? ` (+${change.lineDiff.added}/-${change.lineDiff.removed})` : ''
  return `[${TYPE_LABELS[change.type]}] ${change.path}${lineDiffInfo}`
}

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

const formatDocLink = (change: DocChange): string =>
  change.type !== 'removed' ? `\ndocs: ${DOC_TOP_URL}${change.path}` : ''

const buildReplyParts = (header: string, summary: string | undefined, max: number): string => {
  const truncatedHeader = truncate(header, max)
  if (summary === undefined) return truncatedHeader

  const summaryMax = max - truncatedHeader.length - 1
  if (summaryMax <= 0) return truncatedHeader

  return `${truncatedHeader}\n${truncate(summary, summaryMax)}`
}

const formatReply = (change: DocChange): string => {
  const header = formatChangeLine(change)
  const docLink = formatDocLink(change)
  const contentMax = MAX_POST_LENGTH - docLink.length

  if (contentMax <= 0) return truncate(header, MAX_POST_LENGTH)

  return `${buildReplyParts(header, change.summary, contentMax)}${docLink}`
}

const CHANGE_TYPES = ['added', 'modified', 'removed'] as const

export const formatSummary = (diff: DiffResult): string => {
  const counts = Object.groupBy(diff.changes, (c) => c.type)

  const parts = CHANGE_TYPES.flatMap((type) => {
    const count = counts[type]?.length
    return count !== undefined ? [`${TYPE_LABELS[type]}: ${count}件`] : []
  })

  const header = `[mixi2 Docs 更新]\n${parts.join(' / ')}`

  return diff.changes.reduce((text, change) => {
    const line = `\n${TYPE_SYMBOLS[change.type]} ${shortName(change.path)}`
    return text.length + line.length <= MAX_POST_LENGTH ? text + line : text
  }, header)
}

export const formatReplies = (diff: DiffResult): string[] => {
  const allReplies = diff.changes.map(formatReply)

  if (allReplies.length <= MAX_REPLIES) return allReplies

  return [
    ...allReplies.slice(0, MAX_REPLIES - 1),
    `他 ${allReplies.length - MAX_REPLIES + 1}件の変更があります`,
  ]
}
