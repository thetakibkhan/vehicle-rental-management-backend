import knex, { type Knex } from 'knex'

import type { ApplicationConfig } from '../config/env.js'
import { buildKnexConfig } from './knex-config.js'

export function createDatabaseClient(config: ApplicationConfig): Knex {
  return knex(buildKnexConfig(config))
}
