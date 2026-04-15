import { Hono } from 'hono'
import type { Env } from '../..'
import { imageRoute } from './image'
import { summarizeRoute } from './summarize'

export const debugRoute = new Hono<Env>()
  .route('/image', imageRoute)
  .route('/summarize', summarizeRoute)
