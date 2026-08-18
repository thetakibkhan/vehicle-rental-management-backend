import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express'
import Joi from 'joi'

import { createAuthenticationMiddleware } from '../auth/authentication-middleware.js'
import type { TokenService } from '../auth/token-service.js'
import { AppError } from '../common/errors/app-error.js'
import type { UploadedPhoto } from './photo-storage.js'
import { uploadVehiclePhoto } from './upload-middleware.js'
import type {
  VehicleInput,
  VehicleListRequest,
  VehicleService,
} from './vehicle-service.js'

export interface VehicleRouterDependencies {
  vehicleService: VehicleService
  tokenService: TokenService
}

interface VehicleIdInput {
  id: number
}

const vehicleInputSchema = Joi.object<VehicleInput>({
  name: Joi.string().trim().min(1).max(120).required(),
  plateNumber: Joi.string().trim().min(1).max(50).required(),
  category: Joi.string().trim().min(1).max(80).required(),
  dailyRate: Joi.number().min(0).precision(2).required(),
}).unknown(false)

const listSchema = Joi.object<VehicleListRequest>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().trim().min(1).max(80),
  search: Joi.string().trim().min(1).max(120),
}).unknown(false)

const vehicleIdSchema = Joi.object<VehicleIdInput>({
  id: Joi.number().integer().positive().required(),
}).unknown(false)

export function createVehicleRouter(
  dependencies: VehicleRouterDependencies,
): Router {
  const router = Router()
  const controller = new VehicleController(dependencies.vehicleService)

  router.use(createAuthenticationMiddleware(dependencies.tokenService))
  router.get('/', controller.list)
  router.get('/:id/photo', controller.getPhoto)
  router.get('/:id', controller.getById)
  router.post('/', uploadVehiclePhoto, controller.create)
  router.put('/:id', uploadVehiclePhoto, controller.update)
  router.delete('/:id', controller.delete)

  return router
}

class VehicleController {
  public constructor(private readonly vehicleService: VehicleService) {}

  public readonly list: RequestHandler = (request, response, next): void => {
    void this.handleList(request, response, next)
  }

  public readonly getById: RequestHandler = (request, response, next): void => {
    void this.handleGetById(request, response, next)
  }

  public readonly create: RequestHandler = (request, response, next): void => {
    void this.handleCreate(request, response, next)
  }

  public readonly update: RequestHandler = (request, response, next): void => {
    void this.handleUpdate(request, response, next)
  }

  public readonly delete: RequestHandler = (request, response, next): void => {
    void this.handleDelete(request, response, next)
  }

  public readonly getPhoto: RequestHandler = (
    request,
    response,
    next,
  ): void => {
    void this.handleGetPhoto(request, response, next)
  }

  private async handleList(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const validationResult = listSchema.validate(request.query, {
      abortEarly: false,
      convert: true,
    })
    if (validationResult.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid vehicle query'))
      return
    }

    try {
      response
        .status(200)
        .json(await this.vehicleService.list(validationResult.value))
    } catch (error) {
      next(error)
    }
  }

  private async handleGetById(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.getValidatedId(request, next)
    if (id === undefined) {
      return
    }

    try {
      response.status(200).json(await this.vehicleService.getById(id))
    } catch (error) {
      next(error)
    }
  }

  private async handleCreate(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const input = this.getValidatedVehicleInput(request.body, next)
    if (input === undefined) {
      return
    }

    try {
      const vehicle = await this.vehicleService.create(
        input,
        toUploadedPhoto(request.file),
      )
      response.status(201).json(vehicle)
    } catch (error) {
      next(error)
    }
  }

  private async handleUpdate(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.getValidatedId(request, next)
    const input = this.getValidatedVehicleInput(request.body, next)
    if (id === undefined || input === undefined) {
      return
    }

    try {
      const vehicle = await this.vehicleService.update(
        id,
        input,
        toUploadedPhoto(request.file),
      )
      response.status(200).json(vehicle)
    } catch (error) {
      next(error)
    }
  }

  private async handleDelete(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.getValidatedId(request, next)
    if (id === undefined) {
      return
    }

    try {
      await this.vehicleService.delete(id)
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }

  private async handleGetPhoto(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.getValidatedId(request, next)
    if (id === undefined) {
      return
    }

    try {
      const photoPath = await this.vehicleService.getPhotoFilePath(id)
      response.sendFile(photoPath, (error) => {
        if (error !== undefined) {
          next(new AppError(404, 'PHOTO_NOT_FOUND', 'Vehicle photo not found'))
        }
      })
    } catch (error) {
      next(error)
    }
  }

  private getValidatedId(
    request: Request,
    next: NextFunction,
  ): number | undefined {
    const validationResult = vehicleIdSchema.validate(request.params, {
      abortEarly: false,
      convert: true,
    })
    if (validationResult.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid vehicle id'))
      return undefined
    }

    return validationResult.value.id
  }

  private getValidatedVehicleInput(
    body: unknown,
    next: NextFunction,
  ): VehicleInput | undefined {
    const validationResult = vehicleInputSchema.validate(body, {
      abortEarly: false,
      convert: true,
    })
    if (validationResult.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid vehicle request'))
      return undefined
    }

    return validationResult.value
  }
}

function toUploadedPhoto(
  file: Express.Multer.File | undefined,
): UploadedPhoto | undefined {
  if (file === undefined) {
    return undefined
  }

  return { buffer: file.buffer, mimetype: file.mimetype, size: file.size }
}
