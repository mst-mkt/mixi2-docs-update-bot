import { mixi2Client } from './client'

export type ReplyData = {
  text: string
  mediaId?: string
}

const postReplies = async (replies: ReplyData[], parentPostId: string): Promise<void> => {
  if (replies.length === 0) return

  const [head, ...rest] = replies
  if (head === undefined) return

  const { post } = await mixi2Client.createPost({
    text: head.text,
    inReplyToPostId: parentPostId,
    mediaIdList: head.mediaId !== undefined ? [head.mediaId] : [],
  })

  if (post?.postId !== undefined && rest.length > 0) {
    await postReplies(rest, post.postId)
  }
}

export const postThread = async (summary: string, replies: ReplyData[]): Promise<void> => {
  const { post: rootPost } = await mixi2Client.createPost({ text: summary })

  if (rootPost?.postId !== undefined) {
    await postReplies(replies, rootPost.postId)
  }
}
