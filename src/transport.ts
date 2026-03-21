import type { Interceptor, Transport } from '@connectrpc/connect'
import { createFetchClient } from '@connectrpc/connect/protocol'
import { createTransport } from '@connectrpc/connect/protocol-grpc'

export function createGrpcTransport(options: {
  baseUrl: string
  interceptors?: Interceptor[]
  fetch?: typeof globalThis.fetch
}): Transport {
  const baseFetch = options.fetch ?? fetch

  const wrappedFetch: typeof fetch = async (input, init) => {
    const res = await baseFetch(input, init)

    if (!res.headers.has('grpc-status')) {
      const headers = new Headers(res.headers)
      headers.set('grpc-status', '0')

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      })
    }

    return res
  }

  return createTransport({
    httpClient: createFetchClient(wrappedFetch),
    baseUrl: options.baseUrl,
    useBinaryFormat: true,
    interceptors: options.interceptors ?? [],
    acceptCompression: [],
    sendCompression: null,
    readMaxBytes: 0xffffffff,
    writeMaxBytes: 0xffffffff,
    compressMinBytes: 1024,
  })
}
