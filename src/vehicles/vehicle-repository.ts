export interface Vehicle {
  id: number
  name: string
  plateNumber: string
  category: string
  dailyRate: string
  photoPath: string | undefined
}

export interface VehicleListFilters {
  category?: string
  search?: string
}

export interface VehicleWriteInput {
  name: string
  plateNumber: string
  category: string
  dailyRate: string
  photoPath: string | undefined
}

export interface VehicleRepository {
  findActiveById(id: number): Promise<Vehicle | undefined>
  findActiveByPlateNumber(plateNumber: string): Promise<Vehicle | undefined>
  listActive(filters?: VehicleListFilters): Promise<Vehicle[]>
  create(input: VehicleWriteInput): Promise<Vehicle>
  updateActive(
    id: number,
    input: VehicleWriteInput,
  ): Promise<Vehicle | undefined>
  softDelete(id: number): Promise<boolean>
}
