import { Cron } from 'kuron'
import { Hono } from 'hono'
import { handleScheduled } from './routes/scheduled'

export type Env = {
  Bindings: CloudflareBindings
}

const app = new Hono<Env>()
const cron = new Cron<Env>()

app.get('/', (c) => c.text('mixi2-docs-update-bot is running.'))
cron.schedule('0 0 * * *', handleScheduled)

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled,
}
