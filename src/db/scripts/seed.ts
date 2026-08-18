import { loadEnvironment } from '../../config/env.js'
import { createDatabaseClient } from '../client.js'

const config = loadEnvironment()

if (config.nodeEnv === 'production') {
  throw new Error('Development seeds cannot run in production')
}

const database = createDatabaseClient(config)

try {
  await database.seed.run()
  process.stdout.write('Seed run complete\n')
} finally {
  await database.destroy()
}
