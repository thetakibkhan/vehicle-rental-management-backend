import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { AppError } from '../common/errors/app-error.js'
import './auth-types.js'
import type { TokenService } from './token-service.js'

export function createAuthenticationMiddleware(
  tokenService: TokenService,
): RequestHandler {
  return (request, response, next): void => {
    void authenticateRequest(request, response, next, tokenService)
  }
}

async function authenticateRequest(
  request: Request,
  _response: Response,
  next: NextFunction,
  tokenService: TokenService,
): Promise<void> {
  const token = getBearerToken(request.header('Authorization'))
  if (token === undefined) {
    next(
      new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'),
    )
    return
  }

  const staffId = await tokenService.verifyAccessToken(token)
  if (staffId === undefined) {
    next(
      new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'),
    )
    return
  }

  request.authenticatedStaff = { id: staffId }
  next()
}

function getBearerToken(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined
  }

  const authorizationParts = authorization.trim().split(/\s+/)
  const scheme = authorizationParts[0]
  const token = authorizationParts[1]

  if (
    authorizationParts.length !== 2 ||
    scheme?.toLowerCase() !== 'bearer' ||
    token === undefined ||
    token.length === 0
  ) {
    return undefined
  }

  return token
}
