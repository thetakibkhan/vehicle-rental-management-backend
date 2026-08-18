import type { Knex } from 'knex'

export enum RentalStatus {
  Booked = 'booked',
  Ongoing = 'ongoing',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export const activeRentalStatuses = [RentalStatus.Booked, RentalStatus.Ongoing]

export interface Rental {
  id: number
  vehicleId: number
  customerName: string
  customerPhone: string
  startDate: string
  endDate: string
  totalAmount: string
  status: RentalStatus
}

export interface RentalInput {
  vehicleId: number
  customerName: string
  customerPhone: string
  startDate: string
  endDate: string
  status: RentalStatus
}

export interface RentalListFilters {
  vehicleId?: number
  status?: RentalStatus
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface LockedVehicle {
  id: number
  dailyRate: string
  isDeleted: boolean
}

export interface RentalRepository {
  findById(
    id: number,
    transaction?: Knex.Transaction,
  ): Promise<Rental | undefined>
  findByIdForUpdate(
    id: number,
    transaction: Knex.Transaction,
  ): Promise<Rental | undefined>
  list(filters?: RentalListFilters): Promise<Rental[]>
  lockVehicles(
    ids: number[],
    transaction: Knex.Transaction,
  ): Promise<LockedVehicle[]>
  hasActiveOverlap(
    input: {
      vehicleId: number
      startDate: string
      endDate: string
      excludedRentalId?: number
    },
    transaction: Knex.Transaction,
  ): Promise<boolean>
  create(
    input: RentalInput,
    totalAmount: string,
    transaction: Knex.Transaction,
  ): Promise<Rental>
  update(
    id: number,
    input: RentalInput,
    totalAmount: string,
    transaction: Knex.Transaction,
  ): Promise<Rental | undefined>
  delete(id: number): Promise<boolean>
}
