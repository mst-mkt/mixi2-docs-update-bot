import { describe, expect, it, vi } from 'vite-plus/test'

const mockCreatePost = vi.fn()

vi.mock('./client', () => ({ mixi2Client: { createPost: mockCreatePost } }))

const setupPostIds = (postIds: (string | undefined)[]) => {
  let i = 0
  mockCreatePost.mockReset()
  mockCreatePost.mockImplementation(() => {
    const postId = postIds[i++]
    return Promise.resolve({ post: postId ? { postId } : undefined })
  })
}

const callArg = (i: number) => mockCreatePost.mock.calls[i]?.[0]

const { postThread } = await import('./post')

describe('postThread', () => {
  it('サマリーのみ (リプライなし) の場合は1回だけ投稿する', async () => {
    setupPostIds(['post-1'])
    await postThread('summary', [])

    expect(mockCreatePost).toHaveBeenCalledTimes(1)
    expect(callArg(0)).toMatchObject({ text: 'summary' })
  })

  it('リプライをサマリーへの返信としてスレッド投稿する', async () => {
    setupPostIds(['root', 'reply-1', 'reply-2'])
    await postThread('summary', ['reply 1', 'reply 2'])

    expect(mockCreatePost).toHaveBeenCalledTimes(3)
    expect(callArg(1)).toMatchObject({ text: 'reply 1', inReplyToPostId: 'root' })
    expect(callArg(2)).toMatchObject({ text: 'reply 2', inReplyToPostId: 'reply-1' })
  })

  it('サマリーの投稿が postId を返さない場合はリプライを送らない', async () => {
    setupPostIds([undefined])
    await postThread('summary', ['reply 1'])

    expect(mockCreatePost).toHaveBeenCalledTimes(1)
  })

  it('途中のリプライが postId を返さない場合は以降のリプライを送らない', async () => {
    setupPostIds(['root', undefined])
    await postThread('summary', ['reply 1', 'reply 2'])

    expect(mockCreatePost).toHaveBeenCalledTimes(2)
    expect(callArg(1)).toMatchObject({ text: 'reply 1', inReplyToPostId: 'root' })
  })

  it('リプライが連鎖して前のポストの postId を親にする', async () => {
    setupPostIds(['root', 'r1', 'r2', 'r3'])
    await postThread('summary', ['a', 'b', 'c'])

    expect(callArg(1)).toMatchObject({ text: 'a', inReplyToPostId: 'root' })
    expect(callArg(2)).toMatchObject({ text: 'b', inReplyToPostId: 'r1' })
    expect(callArg(3)).toMatchObject({ text: 'c', inReplyToPostId: 'r2' })
  })
})
