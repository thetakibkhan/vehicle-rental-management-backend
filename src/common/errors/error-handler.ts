import type { ErrorRequestHandler, RequestHandler } from 'express'
import { MulterError } from 'multer'

import { AppError } from './app-error.js'

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'))
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    if (error.headers !== undefined) {
      for (const [name, value] of Object.entries(error.headers)) {
        response.setHeader(name, value)
      }
    }

    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    })
    return
  }

  if (error instanceof MulterError) {
    response.status(422).json({
      success: false,
      error: { code: 'INVALID_UPLOAD', message: 'Invalid vehicle photo' },
    })
    return
  }

  response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  })
}
