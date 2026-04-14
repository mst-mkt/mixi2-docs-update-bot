import { createMixi2Client } from '@mst-mkt/mixi2-application-sdk-ts'

import { authenticator } from './auth'
import { createGrpcTransport } from './transport'

export type Mixi2Client = ReturnType<typeof createMixi2Client>

export const mixi2Client = createMixi2Client({
  authenticator,
  createTransport: createGrpcTransport,
})
