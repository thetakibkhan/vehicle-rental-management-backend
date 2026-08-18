import Joi from 'joi'

export interface SeedStaffConfig {
  name: string
  email: string
  password: string
}

interface ValidatedSeedEnvironment {
  SEED_STAFF_NAME: string
  SEED_STAFF_EMAIL: string
  SEED_STAFF_PASSWORD: string
}

const seedEnvironmentSchema = Joi.object<ValidatedSeedEnvironment>({
  SEED_STAFF_NAME: Joi.string().trim().min(1).max(120).required(),
  SEED_STAFF_EMAIL: Joi.string().trim().email().max(255).required(),
  SEED_STAFF_PASSWORD: Joi.string().min(12).max(128).required(),
}).unknown(true)

export function loadSeedStaffConfig(
  source: NodeJS.ProcessEnv = process.env,
): SeedStaffConfig {
  const validationResult = seedEnvironmentSchema.validate(source, {
    abortEarly: false,
  })

  if (validationResult.error !== undefined) {
    const invalidKeys = [
      ...new Set(
        validationResult.error.details.map((detail) => detail.path.join('.')),
      ),
    ]
    throw new Error(`Invalid seed configuration: ${invalidKeys.join(', ')}`)
  }

  const seedEnvironment = validationResult.value

  return {
    name: seedEnvironment.SEED_STAFF_NAME,
    email: seedEnvironment.SEED_STAFF_EMAIL,
    password: seedEnvironment.SEED_STAFF_PASSWORD,
  }
}
