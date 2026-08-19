import { AppError } from '../common/errors/app-error.js'
import type {
  ReportRepository,
  VehicleRentalReportRow,
} from './report-repository.js'

export interface MonthlyReportRequest {
  month: string
  vehicleId?: number
}
export interface MonthlyReportResult {
  month: string
  data: VehicleRentalReportRow[]
  highestRevenueVehicle: VehicleRentalReportRow | undefined
}

export class ReportService {
  public constructor(private readonly reportRepository: ReportRepository) {}
  public async getMonthlyRentalReport(
    request: MonthlyReportRequest,
  ): Promise<MonthlyReportResult> {
    const { monthStart, monthEnd } = getMonthBounds(request.month)
    const data = await this.reportRepository.getMonthlyRentalReport({
      monthStart,
      monthEnd,
      ...(request.vehicleId === undefined
        ? {}
        : { vehicleId: request.vehicleId }),
    })
    return {
      month: request.month,
      data,
      highestRevenueVehicle: getHighestRevenueVehicle(data),
    }
  }
}

export function getMonthBounds(month: string): {
  monthStart: string
  monthEnd: string
} {
  const parts = /^(\d{4})-(\d{2})$/u.exec(month)
  if (parts === null)
    throw new AppError(422, 'VALIDATION_ERROR', 'Invalid report month')
  const year = Number(parts[1])
  const monthNumber = Number(parts[2])
  if (monthNumber < 1 || monthNumber > 12)
    throw new AppError(422, 'VALIDATION_ERROR', 'Invalid report month')
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return {
    monthStart: `${month}-01`,
    monthEnd: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

function getHighestRevenueVehicle(
  data: VehicleRentalReportRow[],
): VehicleRentalReportRow | undefined {
  return data.reduce<VehicleRentalReportRow | undefined>((highest, vehicle) => {
    if (highest === undefined) return vehicle
    const revenueDifference = compareRevenue(vehicle.revenue, highest.revenue)
    return revenueDifference > 0 ||
      (revenueDifference === 0 && vehicle.vehicleId < highest.vehicleId)
      ? vehicle
      : highest
  }, undefined)
}

function compareRevenue(left: string, right: string): number {
  return toMinorUnits(left) > toMinorUnits(right)
    ? 1
    : toMinorUnits(left) < toMinorUnits(right)
      ? -1
      : 0
}
function toMinorUnits(amount: string): bigint {
  const parts = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(amount)
  const wholeAmount = parts?.[1]
  if (wholeAmount === undefined) throw new Error('Invalid report revenue')
  return BigInt(wholeAmount) * 100n + BigInt((parts?.[2] ?? '').padEnd(2, '0'))
}
