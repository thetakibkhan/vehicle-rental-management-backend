import express, { type Express, type Request, type Response } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createAuthenticationMiddleware } from '../src/auth/authentication-middleware.js'
import { errorHandler } from '../src/common/errors/error-handler.js'
import type { TokenService } from '../src/auth/token-service.js'

class TestTokenService implements TokenService {
  public createAccessToken(_staffId: number): Promise<string> {
    return Promise.resolve('unused')
  }

  public verifyAccessToken(token: string): Promise<number | undefined> {
    return Promise.resolve(token === 'valid-token' ? 42 : undefined)
  }
}

function createProtectedApp(): Express {
  const app = express()
  app.get(
    '/protected',
    createAuthenticationMiddleware(new TestTokenService()),
    (request: Request, response: Response): void => {
      if (request.authenticatedStaff === undefined) {
        response.status(500).end()
        return
      }

      response.status(200).json({ staffId: request.authenticatedStaff.id })
    },
  )
  app.use(errorHandler)
  return app
}

describe('createAuthenticationMiddleware', () => {
  it('rejects a request without a Bearer token', async () => {
    const response = await request(createProtectedApp()).get('/protected')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    })
  })

  it('adds the authenticated staff member after verifying a Bearer token', async () => {
    const response = await request(createProtectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer valid-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ staffId: 42 })
  })
})
