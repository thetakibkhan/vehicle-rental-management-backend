import { describe, expect, it } from 'vitest'

import { VehicleService } from '../src/vehicles/vehicle-service.js'
import type {
  Vehicle,
  VehicleListFilters,
  VehicleRepository,
  VehicleWriteInput,
} from '../src/vehicles/vehicle-repository.js'

const activeVehicle: Vehicle = {
  id: 1,
  name: 'City Sedan',
  plateNumber: 'DHA-1234',
  category: 'Sedan',
  dailyRate: '1200.00',
  photoPath: undefined,
}

class InMemoryVehicleRepository implements VehicleRepository {
  public findActiveById(id: number): Promise<Vehicle | undefined> {
    return Promise.resolve(id === 1 ? activeVehicle : undefined)
  }

  public findActiveByPlateNumber(): Promise<Vehicle | undefined> {
    return Promise.resolve(undefined)
  }

  public listActive(_filters?: VehicleListFilters): Promise<Vehicle[]> {
    return Promise.resolve([activeVehicle])
  }

  public create(_input: VehicleWriteInput): Promise<Vehicle> {
    return Promise.resolve(activeVehicle)
  }

  public updateActive(
    id: number,
    _input: VehicleWriteInput,
  ): Promise<Vehicle | undefined> {
    return Promise.resolve(id === 1 ? activeVehicle : undefined)
  }

  public softDelete(id: number): Promise<boolean> {
    return Promise.resolve(id === 1)
  }
}

describe('VehicleService', () => {
  it('returns only active vehicles with pagination metadata', async () => {
    const service = new VehicleService(new InMemoryVehicleRepository())

    await expect(service.list({ page: 1, limit: 20 })).resolves.toEqual({
      data: [activeVehicle],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
  })

  it('treats a missing or soft-deleted vehicle as unavailable', async () => {
    const service = new VehicleService(new InMemoryVehicleRepository())

    await expect(service.getById(2)).rejects.toMatchObject({
      statusCode: 404,
      code: 'VEHICLE_NOT_FOUND',
    })
  })
})
