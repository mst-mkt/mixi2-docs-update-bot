import { CronHandler } from 'kuron'
import { Env } from '..'
import { getAllDocs } from '../docs'
import { loadDocs, saveDocs } from '../kv'
import { computeDiff, hasChanges } from '../diff'
import { summarizeChange } from '../summarize'
import { createClient, postThread } from '../mixi2'
import { formatReplies, formatSummary } from '../format'

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

  const client = createClient(c.env)
  const summary = formatSummary(diffWithSummary)
  const replies = formatReplies(diffWithSummary)

  await postThread(client, summary, replies)
  await saveDocs(c.env.KV, newDocs, diff)

  console.log(`Posted thread: 1 summary + ${replies.length} replies`)
}
