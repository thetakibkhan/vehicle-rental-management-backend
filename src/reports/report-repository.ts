export interface MonthlyReportQuery {
  monthStart: string
  monthEnd: string
  vehicleId?: number
}

export interface VehicleRentalReportRow {
  vehicleId: number
  vehicleName: string
  totalBookings: number
  daysRented: number
  revenue: string
}

export interface ReportRepository {
  getMonthlyRentalReport(
    query: MonthlyReportQuery,
  ): Promise<VehicleRentalReportRow[]>
}
