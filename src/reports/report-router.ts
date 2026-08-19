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
import type { MonthlyReportRequest, ReportService } from './report-service.js'

export interface ReportRouterDependencies {
  reportService: ReportService
  tokenService: TokenService
}
interface ReportQuery {
  month: string
  vehicle_id?: number
}
const reportSchema = Joi.object<ReportQuery>({
  month: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .required(),
  vehicle_id: Joi.number().integer().positive(),
}).unknown(false)
export function createReportRouter(
  dependencies: ReportRouterDependencies,
): Router {
  const router = Router()
  const controller = new ReportController(dependencies.reportService)
  router.use(createAuthenticationMiddleware(dependencies.tokenService))
  router.get('/rentals', controller.getMonthlyRentalReport)
  return router
}
class ReportController {
  public constructor(private readonly reportService: ReportService) {}
  public readonly getMonthlyRentalReport: RequestHandler = (
    request,
    response,
    next,
  ): void => {
    void this.handleMonthlyReport(request, response, next)
  }
  private async handleMonthlyReport(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const result = reportSchema.validate(request.query, { convert: true })
    if (result.error !== undefined) {
      next(new AppError(422, 'VALIDATION_ERROR', 'Invalid report query'))
      return
    }
    const requestInput: MonthlyReportRequest = {
      month: result.value.month,
      ...(result.value.vehicle_id === undefined
        ? {}
        : { vehicleId: result.value.vehicle_id }),
    }
    try {
      response
        .status(200)
        .json(await this.reportService.getMonthlyRentalReport(requestInput))
    } catch (error) {
      next(error)
    }
  }
}
