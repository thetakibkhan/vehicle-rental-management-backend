import { AppError } from '../common/errors/app-error.js'

const LOGIN_ATTEMPT_LIMIT = 5
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1_000

interface FailedAttemptWindow {
  count: number
  startedAt: number
}

export class LoginRateLimiter {
  private readonly failedAttemptsByIp = new Map<string, FailedAttemptWindow>()

  public assertAllowed(ipAddress: string, now: number = Date.now()): void {
    const attemptWindow = this.getActiveWindow(ipAddress, now)
    if (
      attemptWindow === undefined ||
      attemptWindow.count < LOGIN_ATTEMPT_LIMIT
    ) {
      return
    }

    const retryAfterSeconds = Math.ceil(
      (attemptWindow.startedAt + LOGIN_ATTEMPT_WINDOW_MS - now) / 1_000,
    )
    throw new AppError(
      429,
      'LOGIN_RATE_LIMITED',
      'Too many login attempts. Try again later.',
      { 'Retry-After': String(retryAfterSeconds) },
    )
  }

  public registerFailure(ipAddress: string, now: number = Date.now()): void {
    const attemptWindow = this.getActiveWindow(ipAddress, now)
    if (attemptWindow === undefined) {
      this.failedAttemptsByIp.set(ipAddress, { count: 1, startedAt: now })
      return
    }

    this.failedAttemptsByIp.set(ipAddress, {
      ...attemptWindow,
      count: attemptWindow.count + 1,
    })
  }

  public reset(ipAddress: string): void {
    this.failedAttemptsByIp.delete(ipAddress)
  }

  private getActiveWindow(
    ipAddress: string,
    now: number,
  ): FailedAttemptWindow | undefined {
    const attemptWindow = this.failedAttemptsByIp.get(ipAddress)
    if (attemptWindow === undefined) {
      return undefined
    }

    if (now - attemptWindow.startedAt < LOGIN_ATTEMPT_WINDOW_MS) {
      return attemptWindow
    }

    this.failedAttemptsByIp.delete(ipAddress)
    return undefined
  }
}
