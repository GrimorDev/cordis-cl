import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { config } from './config.js'
import { createWorkers } from './worker.js'
import { registerSignalingHandlers } from './signaling/socketHandler.js'

async function start() {
  await createWorkers()

  const app = express()
  app.use(express.json())

  const httpServer = createServer(app)

  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  registerSignalingHandlers(io)

  httpServer.listen(config.PORT, () => {
    console.log(`🎙️  Cordis Voice Server running on port ${config.PORT}`)
  })

  process.on('SIGTERM', () => {
    httpServer.close()
    process.exit(0)
  })
}

start().catch(err => {
  console.error('Voice server failed to start:', err)
  process.exit(1)
})
