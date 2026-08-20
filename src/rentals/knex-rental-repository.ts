import type { Knex } from 'knex'

import {
  type LockedVehicle,
  type Rental,
  type RentalInput,
  type RentalListFilters,
  type RentalRepository,
  type RentalStatus,
} from './rental-repository.js'

interface RentalRow {
  id: number
  vehicle_id: number
  customer_name: string
  customer_phone: string
  start_date: string
  end_date: string
  total_amount: string
  status: RentalStatus
  updated_at: Date
}
interface VehicleRow {
  id: number
  daily_rate: string
  deleted_at: Date | null
}

export class KnexRentalRepository implements RentalRepository {
  public constructor(private readonly database: Knex) {}
  public async findById(
    id: number,
    transaction?: Knex.Transaction,
  ): Promise<Rental | undefined> {
    const database = transaction ?? this.database
    const row = await database<RentalRow>('rentals').where('id', id).first()
    return row === undefined ? undefined : mapRental(row)
  }
  public async findByIdForUpdate(
    id: number,
    transaction: Knex.Transaction,
  ): Promise<Rental | undefined> {
    const row = await transaction<RentalRow>('rentals')
      .where('id', id)
      .forUpdate()
      .first()
    return row === undefined ? undefined : mapRental(row)
  }
  public async list(filters: RentalListFilters = {}): Promise<Rental[]> {
    const query = this.database<RentalRow>('rentals').orderBy('id', 'asc')
    if (filters.vehicleId !== undefined)
      query.where('vehicle_id', filters.vehicleId)
    if (filters.status !== undefined) query.where('status', filters.status)
    if (filters.dateFrom !== undefined)
      query.where('end_date', '>=', filters.dateFrom)
    if (filters.dateTo !== undefined)
      query.where('start_date', '<=', filters.dateTo)
    if (filters.search !== undefined)
      query.whereILike('customer_name', `%${filters.search}%`)
    return (await query).map(mapRental)
  }
  public async lockVehicles(
    ids: number[],
    transaction: Knex.Transaction,
  ): Promise<LockedVehicle[]> {
    const rows = await transaction<VehicleRow>('vehicles')
      .whereIn('id', ids)
      .orderBy('id', 'asc')
      .forUpdate()
    return rows.map((row) => ({
      id: row.id,
      dailyRate: row.daily_rate,
      isDeleted: row.deleted_at !== null,
    }))
  }
  public async hasActiveOverlap(
    input: {
      vehicleId: number
      startDate: string
      endDate: string
      excludedRentalId?: number
    },
    transaction: Knex.Transaction,
  ): Promise<boolean> {
    const exclusionSql =
      input.excludedRentalId === undefined ? '' : 'AND id <> ?::int'
    const bindings = [
      String(input.vehicleId),
      'booked',
      'ongoing',
      input.endDate,
      input.startDate,
      ...(input.excludedRentalId === undefined
        ? []
        : [String(input.excludedRentalId)]),
    ]
    const result = await transaction.raw<{ rows: { exists: boolean }[] }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM rentals
          WHERE vehicle_id = ?::int
            AND status IN (?, ?)
            AND start_date <= ?::date
            AND end_date >= ?::date
            ${exclusionSql}
        ) AS exists
      `,
      bindings,
    )
    return result.rows[0]?.exists ?? false
  }
  public async create(
    input: RentalInput,
    totalAmount: string,
    transaction: Knex.Transaction,
  ): Promise<Rental> {
    const rows = await transaction<RentalRow>('rentals')
      .insert({
        vehicle_id: input.vehicleId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        start_date: input.startDate,
        end_date: input.endDate,
        status: input.status,
        total_amount: totalAmount,
      })
      .returning([
        'id',
        'vehicle_id',
        'customer_name',
        'customer_phone',
        'start_date',
        'end_date',
        'total_amount',
        'status',
      ])
    const row = rows[0]
    if (row === undefined)
      throw new Error('Rental creation did not return a record')
    return mapRental(row)
  }
  public async update(
    id: number,
    input: RentalInput,
    totalAmount: string,
    transaction: Knex.Transaction,
  ): Promise<Rental | undefined> {
    const rows = await transaction<RentalRow>('rentals')
      .where('id', id)
      .update({
        vehicle_id: input.vehicleId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        start_date: input.startDate,
        end_date: input.endDate,
        status: input.status,
        total_amount: totalAmount,
        updated_at: transaction.fn.now(),
      })
      .returning([
        'id',
        'vehicle_id',
        'customer_name',
        'customer_phone',
        'start_date',
        'end_date',
        'total_amount',
        'status',
      ])
    const row = rows[0]
    return row === undefined ? undefined : mapRental(row)
  }
  public async delete(id: number): Promise<boolean> {
    return (await this.database('rentals').where('id', id).delete()) === 1
  }
}
function mapRental(
  row: Pick<
    RentalRow,
    | 'id'
    | 'vehicle_id'
    | 'customer_name'
    | 'customer_phone'
    | 'start_date'
    | 'end_date'
    | 'total_amount'
    | 'status'
  >,
): Rental {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    startDate: row.start_date,
    endDate: row.end_date,
    totalAmount: row.total_amount,
    status: row.status,
  }
}
