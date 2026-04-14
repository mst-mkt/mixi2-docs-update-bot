import { Cron } from 'kuron'
import { Hono } from 'hono'
import { handleScheduled } from './routes/scheduled'
import { healthzRoute } from './routes/healthz'
import { handleWebhookEvents } from './routes/events'
import { debugRoute } from './routes/debug'

export type Env = {
  Bindings: CloudflareBindings
}

const app = new Hono<Env>()
const cron = new Cron<Env>()

app
  .route('/healthz', healthzRoute)
  .route('/debug', debugRoute)
  .mount('/events', handleWebhookEvents)

cron.schedule('0 * * * *', handleScheduled)

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled,
}
