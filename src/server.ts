import type { Server } from 'node:http'

import { createApp } from './app.js'
import { loadEnvironment } from './config/env.js'
import { createDatabaseClient } from './db/client.js'

const config = loadEnvironment()
const database = createDatabaseClient(config)

async function startServer(): Promise<Server> {
  await database.raw('SELECT 1 AS connection_check')

  return createApp().listen(config.port, () => {
    process.stdout.write(`Server listening on port ${String(config.port)}\n`)
  })
}

async function shutdown(server: Server, signal: string): Promise<void> {
  process.stdout.write(`${signal} received; shutting down\n`)
  server.close()
  await database.destroy()
}

try {
  const server = await startServer()

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void shutdown(server, signal)
    })
  }
} catch {
  await database.destroy()
  process.stderr.write('Server startup failed\n')
  process.exitCode = 1
}
