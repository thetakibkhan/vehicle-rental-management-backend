import type { Knex } from 'knex'

import { AppError } from '../common/errors/app-error.js'
import { calculateRentalAmount } from './rental-calculation.js'
import {
  RentalStatus,
  type Rental,
  type RentalInput,
  type LockedVehicle,
  type RentalListFilters,
  type RentalRepository,
} from './rental-repository.js'

export interface RentalListRequest extends RentalListFilters {
  page: number
  limit: number
}
export interface RentalListResult {
  data: Rental[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export class RentalService {
  public constructor(
    private readonly database: Knex,
    private readonly rentalRepository: RentalRepository,
  ) {}
  public async list(request: RentalListRequest): Promise<RentalListResult> {
    const rentals = await this.rentalRepository.list(request)
    const data = rentals.slice(
      (request.page - 1) * request.limit,
      request.page * request.limit,
    )
    return {
      data,
      meta: {
        page: request.page,
        limit: request.limit,
        total: rentals.length,
        totalPages: Math.ceil(rentals.length / request.limit),
      },
    }
  }
  public async getById(id: number): Promise<Rental> {
    const rental = await this.rentalRepository.findById(id)
    if (rental === undefined)
      throw new AppError(404, 'RENTAL_NOT_FOUND', 'Rental not found')
    return rental
  }
  public async create(input: RentalInput): Promise<Rental> {
    return this.database.transaction(async (transaction) => {
      const vehicle = await this.lockAndGetVehicle(
        [input.vehicleId],
        input.vehicleId,
        transaction,
      )
      const totalAmount = calculateRentalAmount(
        vehicle.dailyRate,
        input.startDate,
        input.endDate,
      )
      await this.assertAvailable(input, transaction)
      return this.rentalRepository.create(input, totalAmount, transaction)
    })
  }
  public async update(id: number, input: RentalInput): Promise<Rental> {
    return this.database.transaction(async (transaction) => {
      const existing = await this.rentalRepository.findByIdForUpdate(
        id,
        transaction,
      )
      if (existing === undefined)
        throw new AppError(404, 'RENTAL_NOT_FOUND', 'Rental not found')
      const vehicleIds = [existing.vehicleId, input.vehicleId]
        .sort((left, right) => left - right)
        .filter((id, index, allIds) => index === 0 || id !== allIds[index - 1])
      const vehicle = await this.lockAndGetVehicle(
        vehicleIds,
        input.vehicleId,
        transaction,
      )
      const totalAmount = calculateRentalAmount(
        vehicle.dailyRate,
        input.startDate,
        input.endDate,
      )
      await this.assertAvailable(input, transaction, id)
      const rental = await this.rentalRepository.update(
        id,
        input,
        totalAmount,
        transaction,
      )
      if (rental === undefined)
        throw new AppError(404, 'RENTAL_NOT_FOUND', 'Rental not found')
      return rental
    })
  }
  public async delete(id: number): Promise<void> {
    if (!(await this.rentalRepository.delete(id)))
      throw new AppError(404, 'RENTAL_NOT_FOUND', 'Rental not found')
  }
  private async lockAndGetVehicle(
    ids: number[],
    vehicleId: number,
    transaction: Knex.Transaction,
  ): Promise<LockedVehicle> {
    const vehicles = await this.rentalRepository.lockVehicles(ids, transaction)
    const vehicle = vehicles.find((candidate) => candidate.id === vehicleId)
    if (vehicle === undefined || vehicle.isDeleted)
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found')
    return vehicle
  }
  private async assertAvailable(
    input: RentalInput,
    transaction: Knex.Transaction,
    excludedRentalId?: number,
  ): Promise<void> {
    if (
      input.status === RentalStatus.Completed ||
      input.status === RentalStatus.Cancelled
    )
      return
    if (
      await this.rentalRepository.hasActiveOverlap(
        {
          vehicleId: input.vehicleId,
          startDate: input.startDate,
          endDate: input.endDate,
          ...(excludedRentalId === undefined ? {} : { excludedRentalId }),
        },
        transaction,
      )
    )
      throw new AppError(
        409,
        'RENTAL_OVERLAP',
        'Vehicle is unavailable for the selected dates',
      )
  }
}
