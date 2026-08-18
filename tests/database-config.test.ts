import { describe, expect, it } from 'vitest'

import { parseEnvironment } from '../src/config/env.js'
import { buildKnexConfig } from '../src/db/knex-config.js'

describe('buildKnexConfig', () => {
  it('maps validated PostgreSQL credentials and pool limits to Knex', () => {
    const applicationConfig = parseEnvironment({
      NODE_ENV: 'test',
      DB_HOST: 'database.internal',
      DB_PORT: '5433',
      DB_NAME: 'rentals',
      DB_USER: 'app_user',
      DB_PASSWORD: 'secret-value',
      DB_POOL_MIN: '3',
      DB_POOL_MAX: '12',
      JWT_SECRET: 'a-test-secret-that-is-at-least-32-characters',
      UPLOAD_PATH: './uploads',
    })

    const knexConfig = buildKnexConfig(applicationConfig)

    expect(knexConfig.client).toBe('pg')
    expect(knexConfig.connection).toEqual({
      host: 'database.internal',
      port: 5433,
      database: 'rentals',
      user: 'app_user',
      password: 'secret-value',
    })
    expect(knexConfig.pool).toEqual({ min: 3, max: 12 })
  })
})
