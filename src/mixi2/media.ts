import { getAccessToken } from './auth'
import { mixi2Client } from './client'

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 2 * 60 * 1_000

export const uploadMedia = async (data: ArrayBuffer, contentType: string, description?: string) => {
  const { mediaId, uploadUrl } = await mixi2Client.initiatePostMediaUpload({
    contentType,
    dataSize: BigInt(data.byteLength),
    mediaType: 1, // IMAGE
    description,
  })

  const accessToken = await getAccessToken()
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      Authorization: `Bearer ${accessToken}`,
    },
    body: data,
  })

  if (!uploadRes.ok) {
    throw new Error(`Media upload failed: ${uploadRes.status}`)
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const { status } = await mixi2Client.getPostMediaStatus({ mediaId })
    if (status === 3) return mediaId // COMPLETED
    if (status === 4) throw new Error('Media processing failed') // FAILED
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }

  throw new Error('Media processing timeout')
}
