import bcrypt from 'bcrypt'

export interface PasswordHasher {
  compare(password: string, passwordHash: string): Promise<boolean>
}

export class BcryptPasswordHasher implements PasswordHasher {
  public async compare(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash)
  }
}
