import bcrypt from 'bcrypt'
import type { Knex } from 'knex'

import { loadSeedStaffConfig } from '../../config/seed-env.js'

const BCRYPT_SALT_ROUNDS = 12

export async function seed(knex: Knex): Promise<void> {
  const staffConfig = loadSeedStaffConfig()
  const passwordHash = await bcrypt.hash(
    staffConfig.password,
    BCRYPT_SALT_ROUNDS,
  )

  await knex('staff').delete()
  await knex('staff').insert({
    email: staffConfig.email.toLowerCase(),
    password_hash: passwordHash,
    name: staffConfig.name,
  })
}
