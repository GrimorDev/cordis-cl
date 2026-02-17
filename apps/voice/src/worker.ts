import * as mediasoup from 'mediasoup'
import type { Worker, RouterRtpCodecCapability } from 'mediasoup/types'
import os from 'os'
import { config } from './config.js'

export const mediaCodecs: RouterRtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: { minptime: 10, useinbandfec: 1 },
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
    },
  },
]

let workers: Worker[] = []
let workerIndex = 0

export async function createWorkers(): Promise<void> {
  const numWorkers = config.NUM_WORKERS === 0 ? os.cpus().length : config.NUM_WORKERS

  console.log(`[Voice] Creating ${numWorkers} mediasoup workers`)

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.NODE_ENV === 'development' ? 'debug' : 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: config.MEDIASOUP_MIN_PORT,
      rtcMaxPort: config.MEDIASOUP_MAX_PORT,
    })

    worker.on('died', err => {
      console.error(`[Voice] Worker died (pid: ${worker.pid}):`, err)
      workers = workers.filter(w => w.pid !== worker.pid)
      // In production, respawn worker
      if (config.NODE_ENV === 'production') {
        setTimeout(() => createWorkers(), 2000)
      }
    })

    workers.push(worker)
    console.log(`[Voice] Worker created (pid: ${worker.pid})`)
  }
}

export function getWorker(): Worker {
  if (workers.length === 0) throw new Error('No mediasoup workers available')
  const worker = workers[workerIndex % workers.length]
  workerIndex++
  return worker
}
