import type { Knex } from 'knex'

import type {
  Vehicle,
  VehicleListFilters,
  VehicleRepository,
  VehicleWriteInput,
} from './vehicle-repository.js'

interface VehicleRow {
  id: number
  name: string
  plate_number: string
  category: string
  daily_rate: string
  photo_path: string | null
  deleted_at: Date | null
  updated_at: Date
}

type VehicleResultRow = Pick<
  VehicleRow,
  'id' | 'name' | 'plate_number' | 'category' | 'daily_rate' | 'photo_path'
>

const vehicleColumns: (keyof VehicleRow)[] = [
  'id',
  'name',
  'plate_number',
  'category',
  'daily_rate',
  'photo_path',
]

export class KnexVehicleRepository implements VehicleRepository {
  public constructor(private readonly database: Knex) {}

  public async findActiveById(id: number): Promise<Vehicle | undefined> {
    const row = await this.baseQuery().where('id', id).first()
    return row === undefined ? undefined : mapVehicle(row)
  }

  public async findActiveByPlateNumber(
    plateNumber: string,
  ): Promise<Vehicle | undefined> {
    const row = await this.baseQuery()
      .whereRaw('LOWER(plate_number) = LOWER(?)', [plateNumber])
      .first()

    return row === undefined ? undefined : mapVehicle(row)
  }

  public async listActive(
    filters: VehicleListFilters = {},
  ): Promise<Vehicle[]> {
    const query = this.baseQuery().orderBy('id', 'asc')

    if (filters.category !== undefined) {
      query.whereRaw('LOWER(category) = LOWER(?)', [filters.category])
    }

    if (filters.search !== undefined) {
      query.whereILike('name', `%${filters.search}%`)
    }

    return (await query).map(mapVehicle)
  }

  public async create(input: VehicleWriteInput): Promise<Vehicle> {
    const rows = await this.database<VehicleRow>('vehicles')
      .insert({
        name: input.name,
        plate_number: input.plateNumber,
        category: input.category,
        daily_rate: input.dailyRate,
        photo_path: input.photoPath ?? null,
      })
      .returning([...vehicleColumns])
    const row = rows[0]

    if (row === undefined) {
      throw new Error('Vehicle creation did not return a record')
    }

    return mapVehicle(row)
  }

  public async updateActive(
    id: number,
    input: VehicleWriteInput,
  ): Promise<Vehicle | undefined> {
    const rows = await this.database<VehicleRow>('vehicles')
      .where('id', id)
      .whereNull('deleted_at')
      .update({
        name: input.name,
        plate_number: input.plateNumber,
        category: input.category,
        daily_rate: input.dailyRate,
        photo_path: input.photoPath ?? null,
        updated_at: this.database.fn.now(),
      })
      .returning([...vehicleColumns])

    const row = rows[0]
    return row === undefined ? undefined : mapVehicle(row)
  }

  public async softDelete(id: number): Promise<boolean> {
    const updatedRows = await this.database<VehicleRow>('vehicles')
      .where('id', id)
      .whereNull('deleted_at')
      .update({
        deleted_at: this.database.fn.now(),
        updated_at: this.database.fn.now(),
      })

    return updatedRows === 1
  }

  private baseQuery(): Knex.QueryBuilder<VehicleRow, VehicleRow[]> {
    return this.database<VehicleRow>('vehicles').whereNull('deleted_at')
  }
}

function mapVehicle(row: VehicleResultRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    plateNumber: row.plate_number,
    category: row.category,
    dailyRate: row.daily_rate,
    photoPath: row.photo_path ?? undefined,
  }
}
