import { jwtVerify, SignJWT } from 'jose'

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 3_600
const ACCESS_TOKEN_ISSUER = 'vehicle-rental-management-backend'
const ACCESS_TOKEN_AUDIENCE = 'vehicle-rental-staff'

export interface TokenService {
  createAccessToken(staffId: number): Promise<string>
  verifyAccessToken(token: string): Promise<number | undefined>
}

export class JoseTokenService implements TokenService {
  private readonly signingKey: Uint8Array

  public constructor(jwtSecret: string) {
    this.signingKey = new TextEncoder().encode(jwtSecret)
  }

  public async createAccessToken(staffId: number): Promise<string> {
    return new SignJWT()
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(String(staffId))
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(String(ACCESS_TOKEN_EXPIRES_IN_SECONDS) + 's')
      .sign(this.signingKey)
  }

  public async verifyAccessToken(token: string): Promise<number | undefined> {
    try {
      const verificationResult = await jwtVerify(token, this.signingKey, {
        algorithms: ['HS256'],
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      })
      return parseStaffId(verificationResult.payload.sub)
    } catch {
      return undefined
    }
  }
}

function parseStaffId(subject: string | undefined): number | undefined {
  if (subject === undefined) {
    return undefined
  }

  const staffId = Number(subject)
  return Number.isSafeInteger(staffId) && staffId > 0 ? staffId : undefined
}
