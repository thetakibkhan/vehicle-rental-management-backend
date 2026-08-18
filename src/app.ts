import express, { type Express, type Request, type Response } from 'express'

import { errorHandler, notFoundHandler } from './common/errors/error-handler.js'

interface HealthResponse {
  success: true
  data: {
    status: 'ok'
  }
}

export function createApp(): Express {
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

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
