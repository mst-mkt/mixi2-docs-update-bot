import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

const mockInitiate = vi.fn()
const mockGetStatus = vi.fn()
const mockGetAccessToken = vi.fn()

vi.mock('./client', () => ({
  mixi2Client: {
    initiatePostMediaUpload: mockInitiate,
    getPostMediaStatus: mockGetStatus,
  },
}))

vi.mock('./auth', () => ({
  getAccessToken: mockGetAccessToken,
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { uploadMedia } = await import('./media')

const imageData = new ArrayBuffer(100)

afterEach(() => {
  vi.resetAllMocks()
})

const setupSuccess = () => {
  mockInitiate.mockResolvedValue({ mediaId: 'media-1', uploadUrl: 'https://upload.example.com' })
  mockGetAccessToken.mockResolvedValue('token-123')
  mockFetch.mockResolvedValue({ ok: true })
  mockGetStatus.mockResolvedValue({ status: 3 })
}

describe('uploadMedia', () => {
  it('アップロード成功時に mediaId を返す', async () => {
    setupSuccess()

    const result = await uploadMedia(imageData, 'image/png')

    expect(result).toBe('media-1')
    expect(mockInitiate).toHaveBeenCalledWith({
      contentType: 'image/png',
      dataSize: BigInt(100),
      mediaType: 1,
    })
    expect(mockFetch).toHaveBeenCalledWith('https://upload.example.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: 'Bearer token-123',
      },
      body: imageData,
    })
  })

  it('description を渡せる', async () => {
    setupSuccess()

    await uploadMedia(imageData, 'image/png', 'diff image')

    expect(mockInitiate).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'diff image' }),
    )
  })

  it('アップロードが HTTP エラーの場合に例外を投げる', async () => {
    mockInitiate.mockResolvedValue({ mediaId: 'media-1', uploadUrl: 'https://upload.example.com' })
    mockGetAccessToken.mockResolvedValue('token-123')
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    await expect(uploadMedia(imageData, 'image/png')).rejects.toThrow('Media upload failed: 500')
  })

  it('ポーリングで FAILED (status 4) の場合に例外を投げる', async () => {
    mockInitiate.mockResolvedValue({ mediaId: 'media-1', uploadUrl: 'https://upload.example.com' })
    mockGetAccessToken.mockResolvedValue('token-123')
    mockFetch.mockResolvedValue({ ok: true })
    mockGetStatus.mockResolvedValue({ status: 4 })

    await expect(uploadMedia(imageData, 'image/png')).rejects.toThrow('Media processing failed')
  })

  it('ポーリングがタイムアウトした場合に例外を投げる', async () => {
    mockInitiate.mockResolvedValue({ mediaId: 'media-1', uploadUrl: 'https://upload.example.com' })
    mockGetAccessToken.mockResolvedValue('token-123')
    mockFetch.mockResolvedValue({ ok: true })
    mockGetStatus.mockResolvedValue({ status: 2 }) // PROCESSING

    await expect(uploadMedia(imageData, 'image/png')).rejects.toThrow('Media processing timeout')
  }, 30_000)

  it('ポーリングで複数回 PROCESSING 後に COMPLETED になる', async () => {
    mockInitiate.mockResolvedValue({ mediaId: 'media-1', uploadUrl: 'https://upload.example.com' })
    mockGetAccessToken.mockResolvedValue('token-123')
    mockFetch.mockResolvedValue({ ok: true })
    mockGetStatus
      .mockResolvedValueOnce({ status: 1 }) // UPLOAD_PENDING
      .mockResolvedValueOnce({ status: 2 }) // PROCESSING
      .mockResolvedValueOnce({ status: 3 }) // COMPLETED

    const result = await uploadMedia(imageData, 'image/png')

    expect(result).toBe('media-1')
    expect(mockGetStatus).toHaveBeenCalledTimes(3)
  })
})
