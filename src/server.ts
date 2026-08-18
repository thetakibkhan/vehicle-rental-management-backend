import type { Server } from 'node:http'

import { createApp } from './app.js'
import { AuthService } from './auth/auth-service.js'
import { LoginRateLimiter } from './auth/login-rate-limiter.js'
import { BcryptPasswordHasher } from './auth/password-hasher.js'
import { KnexStaffRepository } from './auth/staff-repository.js'
import { JoseTokenService } from './auth/token-service.js'
import { loadEnvironment } from './config/env.js'
import { createDatabaseClient } from './db/client.js'
import { KnexVehicleRepository } from './vehicles/knex-vehicle-repository.js'
import { PhotoStorage } from './vehicles/photo-storage.js'
import { VehicleService } from './vehicles/vehicle-service.js'

const config = loadEnvironment()
const database = createDatabaseClient(config)
const tokenService = new JoseTokenService(config.jwtSecret)
const authService = new AuthService(
  new KnexStaffRepository(database),
  new BcryptPasswordHasher(),
  tokenService,
)
const vehicleService = new VehicleService(
  new KnexVehicleRepository(database),
  new PhotoStorage(config.uploadPath),
)
const loginRateLimiter = new LoginRateLimiter()

async function startServer(): Promise<Server> {
  await database.raw('SELECT 1 AS connection_check')

  return createApp({
    auth: { authService, loginRateLimiter },
    vehicles: { vehicleService, tokenService },
  }).listen(config.port, () => {
    process.stdout.write(
      'Server listening on port ' + String(config.port) + '\n',
    )
  })
}

async function shutdown(server: Server, signal: string): Promise<void> {
  process.stdout.write(signal + ' received; shutting down\n')
  server.close()
  await database.destroy()
}

try {
  const server = await startServer()

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void shutdown(server, signal)
    })
  }
} catch {
  await database.destroy()
  process.stderr.write('Server startup failed\n')
  process.exitCode = 1
}
