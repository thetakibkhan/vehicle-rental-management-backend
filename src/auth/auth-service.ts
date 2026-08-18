import { AppError } from '../common/errors/app-error.js'
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  type TokenService,
} from './token-service.js'
import type { PasswordHasher } from './password-hasher.js'
import type { StaffRepository } from './staff-repository.js'

const DUMMY_PASSWORD_HASH =
  '$2b$12$E5neRh5MFY5eJb/nutbUZuavMBsy4Rw93tyD/5GAQwu6Bvbz0n4xi'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
}

export class InvalidCredentialsError extends AppError {
  public constructor() {
    super(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
    this.name = 'InvalidCredentialsError'
  }
}

export class AuthService {
  public constructor(
    private readonly staffRepository: StaffRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  public async authenticate(
    credentials: LoginCredentials,
  ): Promise<LoginResult> {
    const email = credentials.email.trim().toLowerCase()
    const staff = await this.staffRepository.findByEmail(email)
    const passwordHash = staff?.passwordHash ?? DUMMY_PASSWORD_HASH
    const passwordMatches = await this.passwordHasher.compare(
      credentials.password,
      passwordHash,
    )

    if (staff === undefined || !passwordMatches) {
      throw new InvalidCredentialsError()
    }

    return {
      token: await this.tokenService.createAccessToken(staff.id),
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    }
  }
}
