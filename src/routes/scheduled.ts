import { CronErrorHandler, CronHandler } from 'kuron'
import { Env } from '..'
import { getAllDocs, loadDocs, saveDocs } from '../docs'
import { computeDiff, hasChanges, summarizeChange, type DocChange, type DocMap } from '../diff'
import { renderDiffImage } from '../image'
import { formatReplies, formatSummary, mixi2Client, postThread, uploadMedia } from '../mixi2'

const DESCRIPTION_MAX_LENGTH = 394

const buildDescription = (change: DocChange): string => {
  const typeLabel = change.type === 'added' ? '追加' : '更新'
  const prefix = `ドキュメントの変更差分。\`${change.path}\` が${typeLabel}されている。`

  if (change.summary === undefined) {
    if (prefix.length > DESCRIPTION_MAX_LENGTH)
      return `${prefix.slice(0, DESCRIPTION_MAX_LENGTH - 3)}...`
    return prefix
  }

  const summaryHeader = '\n\nAI概要:'
  const remaining = DESCRIPTION_MAX_LENGTH - prefix.length - summaryHeader.length
  if (remaining <= 0) return `${prefix.slice(0, DESCRIPTION_MAX_LENGTH - 3)}...`

  const summary =
    change.summary.length > remaining
      ? `${change.summary.slice(0, remaining - 3)}...`
      : change.summary

  return `${prefix}${summaryHeader}${summary}`
}

const uploadChangeImage = async (change: DocChange, oldDocs: DocMap, newDocs: DocMap) => {
  if (change.type === 'removed') return undefined

  try {
    const oldContent = change.type === 'added' ? '' : (oldDocs.get(change.path) ?? '')
    const newContent = newDocs.get(change.path) ?? ''
    const imageData = await renderDiffImage(oldContent, newContent, change.path)
    return await uploadMedia(imageData, 'image/png', buildDescription(change))
  } catch (e) {
    console.error(`Failed to generate/upload image for ${change.path}:`, e)
    return undefined
  }
}

export const handleScheduled: CronHandler<Env> = async (c) => {
  const newDocs = await getAllDocs()
  const oldDocs = await loadDocs(c.env.KV)

  if (oldDocs.size === 0) {
    console.log('Initial run: saving docs without posting.')
    const initialDiff = computeDiff(oldDocs, newDocs)
    await saveDocs(c.env.KV, newDocs, initialDiff)
    return
  }

  const diff = computeDiff(oldDocs, newDocs)

  if (!hasChanges(diff)) {
    console.log('No documentation changes detected.')
    return
  }

  console.log(`Changes detected: ${diff.changes.length} file(s)`)

  const diffWithSummary = {
    changes: await Promise.all(
      diff.changes.map(async (change) => ({
        ...change,
        summary: await summarizeChange(c.env.AI, change, newDocs, oldDocs),
      })),
    ),
  }

  const summary = formatSummary(diffWithSummary)
  const replyTexts = formatReplies(diffWithSummary)
  const isTruncated = replyTexts.length < diffWithSummary.changes.length

  const mediaIds = await Promise.all(
    replyTexts.map((_, i) => {
      const isOverflowMessage = isTruncated && i === replyTexts.length - 1
      const change = diffWithSummary.changes.at(i)

      if (isOverflowMessage || change === undefined) return Promise.resolve(undefined)

      return uploadChangeImage(change, oldDocs, newDocs)
    }),
  )

  const replies = replyTexts.map((text, i) => ({
    text,
    mediaId: mediaIds.at(i),
  }))

  await postThread(summary, replies)
  await saveDocs(c.env.KV, newDocs, diff)

  console.log(`Posted thread: 1 summary + ${replies.length} replies`)
}

export const handleScheduledError: CronErrorHandler<Env> = async () => {
  await mixi2Client.createPost({
    publishingType: 1, // NOT_PUBLISHING
    text: `⚠️ 定期実行でエラーが発生しました。
@mst_mkt`,
  })
}
