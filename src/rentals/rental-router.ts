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
import { RentalStatus, type RentalInput } from './rental-repository.js'
import type { RentalListRequest, RentalService } from './rental-service.js'

export interface RentalRouterDependencies {
  rentalService: RentalService
  tokenService: TokenService
}
interface RentalRequestBody {
  vehicle_id: number
  customer_name: string
  customer_phone: string
  start_date: string
  end_date: string
  status?: RentalStatus
}
interface IdInput {
  id: number
}
const statusValues = Object.values(RentalStatus)
const rentalSchema = Joi.object<RentalRequestBody>({
  vehicle_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().trim().min(1).max(120).required(),
  customer_phone: Joi.string().trim().min(3).max(30).required(),
  start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  status: Joi.string()
    .valid(...statusValues)
    .default(RentalStatus.Booked),
}).unknown(false)
const idSchema = Joi.object<IdInput>({
  id: Joi.number().integer().positive().required(),
}).unknown(false)
const listSchema = Joi.object<RentalListRequest>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  vehicleId: Joi.number().integer().positive(),
  status: Joi.string().valid(...statusValues),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  search: Joi.string().trim().min(1).max(120),
}).unknown(false)

export function createRentalRouter(
  dependencies: RentalRouterDependencies,
): Router {
  const router = Router()
  const controller = new RentalController(dependencies.rentalService)
  router.use(createAuthenticationMiddleware(dependencies.tokenService))
  router.get('/', controller.list)
  router.get('/:id', controller.getById)
  router.post('/', controller.create)
  router.put('/:id', controller.update)
  router.delete('/:id', controller.delete)
  return router
}
class RentalController {
  public constructor(private readonly rentalService: RentalService) {}
  public readonly list: RequestHandler = (request, response, next): void => {
    void this.handleList(request, response, next)
  }
  public readonly getById: RequestHandler = (request, response, next): void => {
    void this.handleGet(request, response, next)
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
  private async handleList(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const result = listSchema.validate(request.query, { convert: true })
    if (result.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid rental query'))
      return
    }
    try {
      response.status(200).json(await this.rentalService.list(result.value))
    } catch (error) {
      next(error)
    }
  }
  private async handleGet(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.id(request, next)
    if (id === undefined) return
    try {
      response.status(200).json(await this.rentalService.getById(id))
    } catch (error) {
      next(error)
    }
  }
  private async handleCreate(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const input = this.input(request.body, next)
    if (input === undefined) return
    try {
      response.status(201).json(await this.rentalService.create(input))
    } catch (error) {
      next(error)
    }
  }
  private async handleUpdate(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.id(request, next)
    const input = this.input(request.body, next)
    if (id === undefined || input === undefined) return
    try {
      response.status(200).json(await this.rentalService.update(id, input))
    } catch (error) {
      next(error)
    }
  }
  private async handleDelete(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const id = this.id(request, next)
    if (id === undefined) return
    try {
      await this.rentalService.delete(id)
      response.status(204).send()
    } catch (error) {
      next(error)
    }
  }
  private id(request: Request, next: NextFunction): number | undefined {
    const result = idSchema.validate(request.params, { convert: true })
    if (result.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid rental id'))
      return undefined
    }
    return result.value.id
  }
  private input(body: unknown, next: NextFunction): RentalInput | undefined {
    const result = rentalSchema.validate(body, { convert: true })
    if (result.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid rental request'))
      return undefined
    }
    return {
      vehicleId: result.value.vehicle_id,
      customerName: result.value.customer_name,
      customerPhone: result.value.customer_phone,
      startDate: result.value.start_date,
      endDate: result.value.end_date,
      status: result.value.status ?? RentalStatus.Booked,
    }
  }
}
