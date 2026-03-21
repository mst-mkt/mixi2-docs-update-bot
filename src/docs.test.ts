import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { getAllDocs } from './docs'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

afterEach(() => {
  vi.clearAllMocks()
})

const createResponse = (body: string) => new Response(body, { status: 200 })

describe('getAllDocs', () => {
  it('llms-full.txt からパスを抽出し各ドキュメントを取得する', async () => {
    const llmsFullText = [
      '# Overview (/docs/overview)',
      '',
      'Some content here',
      '',
      '# Getting Started (/docs/getting-started)',
    ].join('\n')

    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/docs/llms-full.txt')) return Promise.resolve(createResponse(llmsFullText))
      if (url.endsWith('/docs/overview.mdx'))
        return Promise.resolve(createResponse('overview content'))
      if (url.endsWith('/docs/getting-started.mdx'))
        return Promise.resolve(createResponse('getting started content'))
      return Promise.resolve(createResponse(''))
    })

    const docs = await getAllDocs()

    expect(docs.size).toBe(2)
    expect(docs.get('/docs/overview')).toBe('overview content')
    expect(docs.get('/docs/getting-started')).toBe('getting started content')
  })

  it('/docs/ パスはフィルタされる', async () => {
    const llmsFullText = '# Docs (/docs/)\n# Guide (/docs/guide)'

    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/docs/llms-full.txt')) return Promise.resolve(createResponse(llmsFullText))
      if (url.endsWith('/docs/guide.mdx')) return Promise.resolve(createResponse('guide content'))
      return Promise.resolve(createResponse(''))
    })

    const docs = await getAllDocs()

    expect(docs.size).toBe(1)
    expect(docs.has('/docs/')).toBe(false)
    expect(docs.get('/docs/guide')).toBe('guide content')
  })

  it('見出しのない行は無視される', async () => {
    const llmsFullText = 'just some text\nnot a heading\n# Real (/docs/real)'

    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/docs/llms-full.txt')) return Promise.resolve(createResponse(llmsFullText))
      if (url.endsWith('/docs/real.mdx')) return Promise.resolve(createResponse('real content'))
      return Promise.resolve(createResponse(''))
    })

    const docs = await getAllDocs()

    expect(docs.size).toBe(1)
    expect(docs.get('/docs/real')).toBe('real content')
  })

  it('ドキュメントが0件の場合は空の Map を返す', async () => {
    mockFetch.mockImplementation(() => Promise.resolve(createResponse('no headings here at all')))

    const docs = await getAllDocs()

    expect(docs.size).toBe(0)
  })

  it('全ドキュメントを並列に取得する', async () => {
    const llmsFullText = '# A (/docs/a)\n# B (/docs/b)\n# C (/docs/c)'

    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/docs/llms-full.txt')) return Promise.resolve(createResponse(llmsFullText))
      return Promise.resolve(createResponse(`content of ${url}`))
    })

    const docs = await getAllDocs()

    expect(docs.size).toBe(3)
    expect(mockFetch).toHaveBeenCalledTimes(4) // 1 for llms-full.txt + 3 docs
  })
})
