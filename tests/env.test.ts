import { describe, expect, it } from 'vitest'

import {
  EnvironmentValidationError,
  parseEnvironment,
} from '../src/config/env.js'

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'vehicle_rental_test',
  DB_USER: 'postgres',
  DB_PASSWORD: 'test-password',
  DB_POOL_MIN: '1',
  DB_POOL_MAX: '5',
  JWT_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  UPLOAD_PATH: './uploads',
}

describe('parseEnvironment', () => {
  it('returns a typed configuration for valid variables', () => {
    const config = parseEnvironment(validEnvironment)

    expect(config).toEqual({
      nodeEnv: 'test',
      port: 3000,
      database: {
        host: 'localhost',
        port: 5432,
        name: 'vehicle_rental_test',
        user: 'postgres',
        password: 'test-password',
        pool: { min: 1, max: 5 },
      },
      jwtSecret: 'a-test-secret-that-is-at-least-32-characters',
      uploadPath: './uploads',
    })
  })

  it('applies safe defaults for optional variables', () => {
    const config = parseEnvironment({
      ...validEnvironment,
      NODE_ENV: undefined,
      PORT: undefined,
      DB_PORT: undefined,
      DB_POOL_MIN: undefined,
      DB_POOL_MAX: undefined,
    })

    expect(config.nodeEnv).toBe('development')
    expect(config.port).toBe(3000)
    expect(config.database.port).toBe(5432)
    expect(config.database.pool).toEqual({ min: 2, max: 10 })
  })

  it('rejects a pool maximum lower than the pool minimum', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        DB_POOL_MIN: '8',
        DB_POOL_MAX: '4',
      }),
    ).toThrow(EnvironmentValidationError)
  })

  it('rejects short JWT secrets without exposing their value', () => {
    let capturedError: unknown

    try {
      parseEnvironment({ ...validEnvironment, JWT_SECRET: 'short' })
    } catch (error) {
      capturedError = error
    }

    expect(capturedError).toBeInstanceOf(EnvironmentValidationError)
    expect(String(capturedError)).not.toContain('short')
  })
})
