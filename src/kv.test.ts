import { describe, expect, it, vi } from 'vite-plus/test'
import type { DiffResult, DocMap } from './diff'
import type { KVStore } from './kv'
import { loadDocs, saveDocs } from './kv'

const createMockKV = (store = new Map<string, string>()): KVStore => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
  put: vi.fn((key: string, value: string) => {
    store.set(key, value)
    return Promise.resolve()
  }),
  delete: vi.fn((key: string) => {
    store.delete(key)
    return Promise.resolve()
  }),
})

describe('loadDocs', () => {
  it('manifest が存在しない場合は空の Map を返す', async () => {
    const result = await loadDocs(createMockKV())
    expect(result.size).toBe(0)
  })

  it('manifest に基づいて各ドキュメントを読み込む', async () => {
    const store = new Map([
      ['manifest', JSON.stringify(['/docs/a', '/docs/b'])],
      ['doc:/docs/a', 'content a'],
      ['doc:/docs/b', 'content b'],
    ])
    const result = await loadDocs(createMockKV(store))

    expect(result.size).toBe(2)
    expect(result.get('/docs/a')).toBe('content a')
    expect(result.get('/docs/b')).toBe('content b')
  })

  it('ドキュメントが KV に存在しない場合は空文字を返す', async () => {
    const store = new Map([['manifest', JSON.stringify(['/docs/a'])]])
    const result = await loadDocs(createMockKV(store))
    expect(result.get('/docs/a')).toBe('')
  })

  it('空の manifest の場合は空の Map を返す', async () => {
    const store = new Map([['manifest', '[]']])
    const result = await loadDocs(createMockKV(store))
    expect(result.size).toBe(0)
  })
})

describe('saveDocs', () => {
  const docs: DocMap = new Map([
    ['/docs/a', 'new content a'],
    ['/docs/b', 'content b'],
  ])

  it('manifest を保存する', async () => {
    const kv = createMockKV()
    const diff: DiffResult = { changes: [{ path: '/docs/a', type: 'added' }] }
    await saveDocs(kv, docs, diff)

    expect(kv.put).toHaveBeenCalledWith('manifest', JSON.stringify(['/docs/a', '/docs/b']))
  })

  it('added のドキュメントを保存する', async () => {
    const kv = createMockKV()
    const diff: DiffResult = { changes: [{ path: '/docs/a', type: 'added' }] }
    await saveDocs(kv, docs, diff)

    expect(kv.put).toHaveBeenCalledWith('doc:/docs/a', 'new content a')
  })

  it('modified のドキュメントを保存する', async () => {
    const kv = createMockKV()
    const diff: DiffResult = {
      changes: [{ path: '/docs/a', type: 'modified', lineDiff: { added: 1, removed: 0 } }],
    }
    await saveDocs(kv, docs, diff)

    expect(kv.put).toHaveBeenCalledWith('doc:/docs/a', 'new content a')
  })

  it('removed のドキュメントを削除する', async () => {
    const kv = createMockKV()
    const diff: DiffResult = { changes: [{ path: '/docs/c', type: 'removed' }] }
    await saveDocs(kv, docs, diff)

    expect(kv.delete).toHaveBeenCalledWith('doc:/docs/c')
  })

  it('変更のないドキュメントは保存も削除もしない', async () => {
    const kv = createMockKV()
    const diff: DiffResult = { changes: [{ path: '/docs/a', type: 'added' }] }
    await saveDocs(kv, docs, diff)

    expect(kv.put).not.toHaveBeenCalledWith('doc:/docs/b', expect.anything())
    expect(kv.delete).not.toHaveBeenCalled()
  })

  it('追加・更新・削除が混在する場合にすべて処理する', async () => {
    const kv = createMockKV()
    const diff: DiffResult = {
      changes: [
        { path: '/docs/a', type: 'modified', lineDiff: { added: 1, removed: 0 } },
        { path: '/docs/b', type: 'added' },
        { path: '/docs/c', type: 'removed' },
      ],
    }
    const allDocs: DocMap = new Map([
      ['/docs/a', 'updated a'],
      ['/docs/b', 'new b'],
    ])
    await saveDocs(kv, allDocs, diff)

    expect(kv.put).toHaveBeenCalledWith('doc:/docs/a', 'updated a')
    expect(kv.put).toHaveBeenCalledWith('doc:/docs/b', 'new b')
    expect(kv.delete).toHaveBeenCalledWith('doc:/docs/c')
  })
})
