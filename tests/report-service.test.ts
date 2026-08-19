import { describe, expect, it } from 'vitest'
import { ReportService } from '../src/reports/report-service.js'
import type {
  MonthlyReportQuery,
  ReportRepository,
  VehicleRentalReportRow,
} from '../src/reports/report-repository.js'
const rows: VehicleRentalReportRow[] = [
  {
    vehicleId: 1,
    vehicleName: 'Toyota Corolla',
    totalBookings: 1,
    daysRented: 3,
    revenue: '210.00',
  },
  {
    vehicleId: 2,
    vehicleName: 'Toyota Hiace',
    totalBookings: 1,
    daysRented: 1,
    revenue: '110.00',
  },
]
class InMemoryReportRepository implements ReportRepository {
  public getMonthlyRentalReport(
    _query: MonthlyReportQuery,
  ): Promise<VehicleRentalReportRow[]> {
    return Promise.resolve(rows)
  }
}
describe('ReportService', () => {
  it('returns clipped monthly rows and the highest-revenue vehicle', async () => {
    await expect(
      new ReportService(new InMemoryReportRepository()).getMonthlyRentalReport({
        month: '2026-08',
      }),
    ).resolves.toMatchObject({
      month: '2026-08',
      data: rows,
      highestRevenueVehicle: rows[0],
    })
  })
})
