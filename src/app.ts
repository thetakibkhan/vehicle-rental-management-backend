import express, { type Express, type Request, type Response } from 'express'

import { createAuthRouter } from './auth/auth-router.js'
import type { AuthRouterDependencies } from './auth/auth-router.js'
import { errorHandler, notFoundHandler } from './common/errors/error-handler.js'
import { createVehicleRouter } from './vehicles/vehicle-router.js'
import type { VehicleRouterDependencies } from './vehicles/vehicle-router.js'
import { createRentalRouter } from './rentals/rental-router.js'
import type { RentalRouterDependencies } from './rentals/rental-router.js'
import { createReportRouter } from './reports/report-router.js'
import type { ReportRouterDependencies } from './reports/report-router.js'

interface HealthResponse {
  success: true
  data: {
    status: 'ok'
  }
}

export interface AppDependencies {
  auth?: AuthRouterDependencies
  vehicles?: VehicleRouterDependencies
  rentals?: RentalRouterDependencies
  reports?: ReportRouterDependencies
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  app.get(
    '/health',
    (_request: Request, response: Response<HealthResponse>): void => {
      response.status(200).json({
        success: true,
        data: { status: 'ok' },
      })
    },
  )

  if (dependencies.auth !== undefined) {
    app.use('/auth', createAuthRouter(dependencies.auth))
  }

  if (dependencies.vehicles !== undefined) {
    app.use('/vehicles', createVehicleRouter(dependencies.vehicles))
  }

  if (dependencies.rentals !== undefined) {
    app.use('/rentals', createRentalRouter(dependencies.rentals))
  }

  if (dependencies.reports !== undefined) {
    app.use('/reports', createReportRouter(dependencies.reports))
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
