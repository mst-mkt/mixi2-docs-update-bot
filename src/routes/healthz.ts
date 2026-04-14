import { Hono } from 'hono'
import { Env } from 'kuron'

export const healthzRoute = new Hono<Env>().get('/', (c) => c.text('OK'))
