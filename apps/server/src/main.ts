import { config } from './config.js'
import { buildApp } from './app.js'
import { db } from './db/index.js'
import { redis, redisSub } from './redis/index.js'

async function start() {
  const fastify = buildApp()

  try {
    // Connect Redis
    await redis.connect()
    await redisSub.connect()
    fastify.log.info('✅ Redis connected')

    // Test DB connection
    await db.query('SELECT 1')
    fastify.log.info('✅ PostgreSQL connected')

    await fastify.listen({ port: config.PORT, host: config.HOST })
    fastify.log.info(`🚀 Cordis API running on port ${config.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  await redis.quit()
  await redisSub.quit()
  await db.end()
  process.exit(0)
})

start()
