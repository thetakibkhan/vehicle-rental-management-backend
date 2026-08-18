import dotenv from 'dotenv'
import Joi from 'joi'

export type NodeEnvironment = 'development' | 'test' | 'production'

export interface DatabaseConfig {
  host: string
  port: number
  name: string
  user: string
  password: string
  pool: {
    min: number
    max: number
  }
}

export interface ApplicationConfig {
  nodeEnv: NodeEnvironment
  port: number
  database: DatabaseConfig
  jwtSecret: string
  uploadPath: string
}

interface ValidatedEnvironment {
  NODE_ENV: NodeEnvironment
  PORT: number
  DB_HOST: string
  DB_PORT: number
  DB_NAME: string
  DB_USER: string
  DB_PASSWORD: string
  DB_POOL_MIN: number
  DB_POOL_MAX: number
  JWT_SECRET: string
  UPLOAD_PATH: string
}

const environmentSchema = Joi.object<ValidatedEnvironment>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65_535).default(3000),
  DB_HOST: Joi.string().trim().min(1).required(),
  DB_PORT: Joi.number().integer().min(1).max(65_535).default(5432),
  DB_NAME: Joi.string().trim().min(1).required(),
  DB_USER: Joi.string().trim().min(1).required(),
  DB_PASSWORD: Joi.string().min(1).required(),
  DB_POOL_MIN: Joi.number().integer().min(0).default(2),
  DB_POOL_MAX: Joi.number().integer().min(Joi.ref('DB_POOL_MIN')).default(10),
  JWT_SECRET: Joi.string().min(32).required(),
  UPLOAD_PATH: Joi.string().trim().min(1).required(),
}).unknown(true)

export class EnvironmentValidationError extends Error {
  public constructor(invalidKeys: readonly string[]) {
    super(`Invalid environment configuration: ${invalidKeys.join(', ')}`)
    this.name = 'EnvironmentValidationError'
  }
}

export function parseEnvironment(source: NodeJS.ProcessEnv): ApplicationConfig {
  const validationResult = environmentSchema.validate(source, {
    abortEarly: false,
    convert: true,
  })

  if (validationResult.error !== undefined) {
    const invalidKeys = [
      ...new Set(
        validationResult.error.details.map((detail) => detail.path.join('.')),
      ),
    ]
    throw new EnvironmentValidationError(invalidKeys)
  }

  const environment = validationResult.value

  return {
    nodeEnv: environment.NODE_ENV,
    port: environment.PORT,
    database: {
      host: environment.DB_HOST,
      port: environment.DB_PORT,
      name: environment.DB_NAME,
      user: environment.DB_USER,
      password: environment.DB_PASSWORD,
      pool: {
        min: environment.DB_POOL_MIN,
        max: environment.DB_POOL_MAX,
      },
    },
    jwtSecret: environment.JWT_SECRET,
    uploadPath: environment.UPLOAD_PATH,
  }
}

export function loadEnvironment(): ApplicationConfig {
  dotenv.config({ quiet: true })
  return parseEnvironment(process.env)
}
