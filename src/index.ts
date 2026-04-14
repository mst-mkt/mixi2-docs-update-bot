import { Cron } from 'kuron'
import { Hono } from 'hono'
import { handleScheduled } from './routes/scheduled'
import { healthzRoute } from './routes/healthz'
import { handleWebhookEvents } from './routes/events'

export type Env = {
  Bindings: CloudflareBindings
}

const app = new Hono<Env>()
const cron = new Cron<Env>()

app.route('/healthz', healthzRoute).mount('/events', handleWebhookEvents)
cron.schedule('0 * * * *', handleScheduled)

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled,
}
