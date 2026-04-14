import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@takumi-rs/wasm', () => ({
  initSync: vi.fn(),
  Renderer: class MockRenderer {
    render = vi.fn()
  },
}))

vi.mock('@takumi-rs/wasm/takumi_wasm_bg.wasm', () => ({ default: {} }))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const okResponse = () => {
  return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
}

const errorResponse = (status: number) => {
  return Promise.resolve({
    ok: false,
    status,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  })
}

describe('getRenderer', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('フォントの取得に成功した場合は Renderer を返す', async () => {
    mockFetch.mockImplementation(okResponse)
    const { getRenderer } = await import('./renderer')

    const renderer = await getRenderer()
    expect(renderer).toBeDefined()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('フォントの取得が失敗した場合はエラーを投げる', async () => {
    mockFetch.mockImplementation(() => errorResponse(404))
    const { getRenderer } = await import('./renderer')

    await expect(getRenderer()).rejects.toThrow('Failed to fetch font')
    await expect(getRenderer()).rejects.toThrow('404')
  })

  it('2回目の呼び出しではキャッシュされた Renderer を返す', async () => {
    mockFetch.mockImplementation(okResponse)
    const { getRenderer } = await import('./renderer')

    const first = await getRenderer()
    const second = await getRenderer()

    expect(first).toBe(second)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
