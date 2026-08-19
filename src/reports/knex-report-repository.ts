import type { Knex } from 'knex'
import type {
  MonthlyReportQuery,
  ReportRepository,
  VehicleRentalReportRow,
} from './report-repository.js'

interface ReportRow {
  vehicle_id: number
  vehicle_name: string
  total_bookings: number
  days_rented: number
  revenue: string
}
interface QueryResult {
  rows: ReportRow[]
}

export class KnexReportRepository implements ReportRepository {
  public constructor(private readonly database: Knex) {}
  public async getMonthlyRentalReport(
    query: MonthlyReportQuery,
  ): Promise<VehicleRentalReportRow[]> {
    const result = await this.database.raw<QueryResult>(
      `
      SELECT v.id AS vehicle_id, v.name AS vehicle_name,
        COUNT(r.id)::int AS total_bookings,
        SUM(LEAST(r.end_date, ?::date) - GREATEST(r.start_date, ?::date) + 1)::int AS days_rented,
        SUM((r.total_amount / (r.end_date - r.start_date + 1)) * (LEAST(r.end_date, ?::date) - GREATEST(r.start_date, ?::date) + 1))::numeric(12, 2)::text AS revenue
      FROM rentals r
      INNER JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.status <> 'cancelled' AND r.start_date <= ?::date AND r.end_date >= ?::date
        AND (?::int IS NULL OR v.id = ?::int)
      GROUP BY v.id, v.name
      ORDER BY v.id ASC
    `,
      [
        query.monthEnd,
        query.monthStart,
        query.monthEnd,
        query.monthStart,
        query.monthEnd,
        query.monthStart,
        query.vehicleId ?? null,
        query.vehicleId ?? null,
      ],
    )
    return result.rows.map((row) => ({
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      totalBookings: row.total_bookings,
      daysRented: row.days_rented,
      revenue: row.revenue,
    }))
  }
}
