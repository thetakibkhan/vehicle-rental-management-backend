import { Router, type NextFunction, type Request, type Response } from 'express'
import Joi from 'joi'

import { AppError } from '../common/errors/app-error.js'
import { InvalidCredentialsError } from './auth-service.js'
import type {
  AuthService,
  LoginCredentials,
  LoginResult,
} from './auth-service.js'
import type { LoginRateLimiter } from './login-rate-limiter.js'

export interface AuthRouterDependencies {
  authService: AuthService
  loginRateLimiter: LoginRateLimiter
}

const loginSchema = Joi.object<LoginCredentials>({
  email: Joi.string().trim().email().max(255).required(),
  password: Joi.string().min(1).max(128).required(),
}).unknown(false)

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router()
  const controller = new AuthController(
    dependencies.authService,
    dependencies.loginRateLimiter,
  )

  router.post('/login', controller.login)
  return router
}

class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly loginRateLimiter: LoginRateLimiter,
  ) {}

  public readonly login = (
    request: Request<Record<string, never>, LoginResult, LoginCredentials>,
    response: Response<LoginResult>,
    next: NextFunction,
  ): void => {
    void this.handleLogin(request, response, next)
  }

  private async handleLogin(
    request: Request<Record<string, never>, LoginResult, LoginCredentials>,
    response: Response<LoginResult>,
    next: NextFunction,
  ): Promise<void> {
    const validationResult = loginSchema.validate(request.body, {
      abortEarly: false,
      convert: true,
    })

    if (validationResult.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid login request'))
      return
    }

    const ipAddress = request.ip ?? 'unknown'

    try {
      this.loginRateLimiter.assertAllowed(ipAddress)
      const loginResult = await this.authService.authenticate(
        validationResult.value,
      )
      this.loginRateLimiter.reset(ipAddress)
      response.status(200).json(loginResult)
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        this.loginRateLimiter.registerFailure(ipAddress)
      }
      next(error)
    }
  }
}
