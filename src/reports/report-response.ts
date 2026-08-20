import type { MonthlyReportResult } from './report-service.js'

export interface ReportVehicleResponse {
  id: number
  name: string
  total_bookings: number
  days_rented: number
  revenue: string
}

export interface MonthlyReportResponse {
  month: string
  data: ReportVehicleResponse[]
  highest_revenue_vehicle: ReportVehicleResponse | undefined
}

export function toMonthlyReportResponse(
  result: MonthlyReportResult,
): MonthlyReportResponse {
  const mapVehicle = (
    vehicle: MonthlyReportResult['data'][number],
  ): ReportVehicleResponse => ({
    id: vehicle.vehicleId,
    name: vehicle.vehicleName,
    total_bookings: vehicle.totalBookings,
    days_rented: vehicle.daysRented,
    revenue: vehicle.revenue,
  })

  return {
    month: result.month,
    data: result.data.map(mapVehicle),
    highest_revenue_vehicle:
      result.highestRevenueVehicle === undefined
        ? undefined
        : mapVehicle(result.highestRevenueVehicle),
  }
}
