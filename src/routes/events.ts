import { createEventHandler, createWebhookHandler } from '@mst-mkt/mixi2-application-sdk-ts'
import { env } from 'cloudflare:workers'
import { createClient } from '../mixi2'

const mixi2Client = createClient(env)

const eventHandlers = createEventHandler({
  postCreated: async ({ post }) => {
    if (post === undefined) return

    await mixi2Client.addStampToPost({
      postId: post.postId,
      stampId: 'o_mixi2',
    })
  },
})

export const handleWebhookEvents = createWebhookHandler(
  { signaturePublicKey: env.SIGNATURE_PUBLIC_KEY, syncHandling: true },
  eventHandlers,
)
