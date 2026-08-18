import type { Knex } from 'knex'

export interface StaffAuthenticationRecord {
  id: number
  email: string
  passwordHash: string
}

export interface StaffRepository {
  findByEmail(email: string): Promise<StaffAuthenticationRecord | undefined>
}

interface StaffAuthenticationRow {
  id: number
  email: string
  password_hash: string
}

export class KnexStaffRepository implements StaffRepository {
  public constructor(private readonly database: Knex) {}

  public async findByEmail(
    email: string,
  ): Promise<StaffAuthenticationRecord | undefined> {
    const staff = await this.database<StaffAuthenticationRow>('staff')
      .select('id', 'email', 'password_hash')
      .where({ email })
      .first()

    if (staff === undefined) {
      return undefined
    }

    return {
      id: staff.id,
      email: staff.email,
      passwordHash: staff.password_hash,
    }
  }
}
