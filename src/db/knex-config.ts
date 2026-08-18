import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Knex } from 'knex'

import type { ApplicationConfig } from '../config/env.js'

const currentExtension = extname(fileURLToPath(import.meta.url))
const migrationsDirectory = fileURLToPath(
  new URL('./migrations', import.meta.url),
)
const seedsDirectory = fileURLToPath(new URL('./seeds', import.meta.url))

export function buildKnexConfig(config: ApplicationConfig): Knex.Config {
  return {
    client: 'pg',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    },
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
    },
    migrations: {
      directory: migrationsDirectory,
      extension: currentExtension.slice(1),
      loadExtensions: [currentExtension],
    },
    seeds: {
      directory: seedsDirectory,
      extension: currentExtension.slice(1),
      loadExtensions: [currentExtension],
    },
  }
}
