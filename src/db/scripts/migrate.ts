import { loadEnvironment } from '../../config/env.js'
import { createDatabaseClient } from '../client.js'

const config = loadEnvironment()
const database = createDatabaseClient(config)

try {
  const [batch, migrations] = (await database.migrate.latest()) as [
    number,
    string[],
  ]
  process.stdout.write(
    `Migration batch ${String(batch)} complete (${String(migrations.length)} migration(s))\n`,
  )
} finally {
  await database.destroy()
}
