import { loadEnvironment } from '../../config/env.js'
import { createDatabaseClient } from '../client.js'

const config = loadEnvironment()
const database = createDatabaseClient(config)

try {
  await database.raw('SELECT 1 AS connection_check')
  process.stdout.write('Database connection successful\n')
} finally {
  await database.destroy()
}
