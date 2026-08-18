import { describe, expect, it } from 'vitest'

import {
  AuthService,
  InvalidCredentialsError,
} from '../src/auth/auth-service.js'
import type { PasswordHasher } from '../src/auth/password-hasher.js'
import type {
  StaffAuthenticationRecord,
  StaffRepository,
} from '../src/auth/staff-repository.js'
import type { TokenService } from '../src/auth/token-service.js'

const staffRecord: StaffAuthenticationRecord = {
  id: 42,
  email: 'staff@example.com',
  passwordHash: 'stored-password-hash',
}

class InMemoryStaffRepository implements StaffRepository {
  public constructor(private readonly staff?: StaffAuthenticationRecord) {}

  public findByEmail(
    _email: string,
  ): Promise<StaffAuthenticationRecord | undefined> {
    return Promise.resolve(this.staff)
  }
}

class RecordingPasswordHasher implements PasswordHasher {
  public comparedHashes: string[] = []

  public constructor(private readonly matches: boolean) {}

  public compare(password: string, passwordHash: string): Promise<boolean> {
    this.comparedHashes.push(passwordHash)
    return Promise.resolve(this.matches && password === 'correct-password')
  }
}

class FixedTokenService implements TokenService {
  public createAccessToken(staffId: number): Promise<string> {
    return Promise.resolve('token-for-' + String(staffId))
  }

  public verifyAccessToken(_token: string): Promise<number | undefined> {
    return Promise.resolve(undefined)
  }
}

describe('AuthService', () => {
  it('normalizes the email, verifies the stored hash, and issues a token', async () => {
    const passwordHasher = new RecordingPasswordHasher(true)
    const authService = new AuthService(
      new InMemoryStaffRepository(staffRecord),
      passwordHasher,
      new FixedTokenService(),
    )

    const result = await authService.authenticate({
      email: ' Staff@Example.COM ',
      password: 'correct-password',
    })

    expect(result).toEqual({
      token: 'token-for-42',
      tokenType: 'Bearer',
      expiresIn: 3600,
    })
    expect(passwordHasher.comparedHashes).toEqual(['stored-password-hash'])
  })

  it('returns the same authentication error when no staff record matches', async () => {
    const passwordHasher = new RecordingPasswordHasher(false)
    const authService = new AuthService(
      new InMemoryStaffRepository(),
      passwordHasher,
      new FixedTokenService(),
    )

    await expect(
      authService.authenticate({
        email: 'unknown@example.com',
        password: 'incorrect-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
    expect(passwordHasher.comparedHashes).toHaveLength(1)
  })
})
