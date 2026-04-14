import { createAuthenticator } from '@mst-mkt/mixi2-application-sdk-ts'
import { env } from 'cloudflare:workers'

export const authenticator = createAuthenticator({
  clientId: env.MIXI2_CLIENT_ID,
  clientSecret: env.MIXI2_CLIENT_SECRET,
})

export const getAccessToken = () => authenticator.getAccessToken()
