import type { Interceptor, Transport } from '@connectrpc/connect'
import { createFetchClient } from '@connectrpc/connect/protocol'
import { createTransport } from '@connectrpc/connect/protocol-grpc'

type GrpcTransportOptions = {
  baseUrl: string
  interceptors?: Interceptor[]
  fetch?: typeof globalThis.fetch
}

const ensureGrpcStatus = (res: Response): Response =>
  res.headers.has('grpc-status')
    ? res
    : new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: new Headers([...res.headers, ['grpc-status', '0']]),
      })

export const createGrpcTransport = (options: GrpcTransportOptions): Transport => {
  const baseFetch = options.fetch ?? fetch

  return createTransport({
    httpClient: createFetchClient(async (input, init) =>
      ensureGrpcStatus(await baseFetch(input, init)),
    ),
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
