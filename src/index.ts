import { computeDiff, hasChanges } from './diff'
import { getAllDocs } from './docs'
import { formatReplies, formatSummary } from './format'
import { loadDocs, saveDocs } from './kv'
import { createClient, postThread } from './mixi2'
import { summarizeChange } from './summarize'

const handleScheduled = async (
  _controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
) => {
  const newDocs = await getAllDocs()
  const oldDocs = await loadDocs(env.KV)

  if (oldDocs.size === 0) {
    console.log('Initial run: saving docs without posting.')
    const initialDiff = computeDiff(oldDocs, newDocs)
    await saveDocs(env.KV, newDocs, initialDiff)
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
        summary: await summarizeChange(env.AI, change, newDocs, oldDocs),
      })),
    ),
  }

  const client = createClient(env)
  const summary = formatSummary(diffWithSummary)
  const replies = formatReplies(diffWithSummary)

  await postThread(client, summary, replies)
  await saveDocs(env.KV, newDocs, diff)

  console.log(`Posted thread: 1 summary + ${replies.length} replies`)
}

export default {
  fetch: async () => {
    return new Response('mixi2-docs-update-bot is running.')
  },
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>
