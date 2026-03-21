import { describe, expect, it } from 'vite-plus/test'
import type { Mixi2Client } from './mixi2'
import { postThread } from './mixi2'

type Call = { text?: string; inReplyToPostId?: string }

const createMockClient = (postIds: (string | undefined)[]) => {
  const calls: Call[] = []
  const idIterator = postIds[Symbol.iterator]()

  const client: Mixi2Client = {
    createPost: (params) => {
      calls.push({ text: params.text, inReplyToPostId: params.inReplyToPostId })
      const postId = idIterator.next().value
      return Promise.resolve({ post: postId ? { postId } : undefined })
    },
  }

  return { client, calls }
}

describe('postThread', () => {
  it('サマリーのみ (リプライなし) の場合は1回だけ投稿する', async () => {
    const { client, calls } = createMockClient(['post-1'])
    await postThread(client, 'summary', [])

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ text: 'summary', inReplyToPostId: undefined })
  })

  it('リプライをサマリーへの返信としてスレッド投稿する', async () => {
    const { client, calls } = createMockClient(['root', 'reply-1', 'reply-2'])
    await postThread(client, 'summary', ['reply 1', 'reply 2'])

    expect(calls).toHaveLength(3)
    expect(calls[1]).toEqual({ text: 'reply 1', inReplyToPostId: 'root' })
    expect(calls[2]).toEqual({ text: 'reply 2', inReplyToPostId: 'reply-1' })
  })

  it('サマリーの投稿が postId を返さない場合はリプライを送らない', async () => {
    const { client, calls } = createMockClient([undefined])
    await postThread(client, 'summary', ['reply 1'])

    expect(calls).toHaveLength(1)
  })

  it('途中のリプライが postId を返さない場合は以降のリプライを送らない', async () => {
    const { client, calls } = createMockClient(['root', undefined])
    await postThread(client, 'summary', ['reply 1', 'reply 2'])

    expect(calls).toHaveLength(2)
    expect(calls[1]).toEqual({ text: 'reply 1', inReplyToPostId: 'root' })
  })

  it('リプライが連鎖して前のポストの postId を親にする', async () => {
    const { client, calls } = createMockClient(['root', 'r1', 'r2', 'r3'])
    await postThread(client, 'summary', ['a', 'b', 'c'])

    expect(calls[1]).toEqual({ text: 'a', inReplyToPostId: 'root' })
    expect(calls[2]).toEqual({ text: 'b', inReplyToPostId: 'r1' })
    expect(calls[3]).toEqual({ text: 'c', inReplyToPostId: 'r2' })
  })
})
