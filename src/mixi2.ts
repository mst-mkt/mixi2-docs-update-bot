import { createAuthenticator, createMixi2Client } from '@mst-mkt/mixi2-application-sdk-ts'
import { createGrpcTransport } from './transport'

type FullClient = ReturnType<typeof createMixi2Client>

export type Mixi2Client = {
  createPost: (...args: Parameters<FullClient['createPost']>) => Promise<{
    post?: { postId?: string }
  }>
}

export const createClient = (env: Env): FullClient => {
  const authenticator = createAuthenticator({
    clientId: env.MIXI2_CLIENT_ID,
    clientSecret: env.MIXI2_CLIENT_SECRET,
  })

  return createMixi2Client({
    authenticator,
    createTransport: createGrpcTransport,
  })
}

const postReplies = async (
  client: Mixi2Client,
  replies: string[],
  parentPostId: string,
): Promise<void> => {
  if (replies.length === 0) return

  const [head, ...rest] = replies
  const { post } = await client.createPost({
    text: head,
    inReplyToPostId: parentPostId,
  })

  if (post?.postId && rest.length > 0) {
    await postReplies(client, rest, post.postId)
  }
}

export const postThread = async (
  client: Mixi2Client,
  summary: string,
  replies: string[],
): Promise<void> => {
  const { post: rootPost } = await client.createPost({ text: summary })
  if (rootPost?.postId) {
    await postReplies(client, replies, rootPost.postId)
  }
}
