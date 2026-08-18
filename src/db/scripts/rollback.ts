import { loadEnvironment } from '../../config/env.js'
import { createDatabaseClient } from '../client.js'

const config = loadEnvironment()
const database = createDatabaseClient(config)

try {
  const [batch, migrations] = (await database.migrate.rollback()) as [
    number,
    string[],
  ]
  process.stdout.write(
    `Rolled back batch ${String(batch)} (${String(migrations.length)} migration(s))\n`,
  )
} finally {
  await database.destroy()
}
