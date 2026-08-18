import { AppError } from '../common/errors/app-error.js'
import type { UploadedPhoto } from './photo-storage.js'
import type {
  Vehicle,
  VehicleRepository,
  VehicleWriteInput,
} from './vehicle-repository.js'

export interface VehicleListRequest {
  page: number
  limit: number
  category?: string
  search?: string
}

export interface VehicleInput {
  name: string
  plateNumber: string
  category: string
  dailyRate: number
}

export interface VehicleListResult {
  data: Vehicle[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface VehiclePhotoStorage {
  save(photo: UploadedPhoto): Promise<string>
  remove(fileName: string): Promise<void>
  getFilePath(fileName: string): string
}

export class VehicleService {
  public constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly photoStorage?: VehiclePhotoStorage,
  ) {}

  public async list(request: VehicleListRequest): Promise<VehicleListResult> {
    const filters = {
      ...(request.category === undefined ? {} : { category: request.category }),
      ...(request.search === undefined ? {} : { search: request.search }),
    }
    const vehicles = await this.vehicleRepository.listActive(filters)
    const startIndex = (request.page - 1) * request.limit
    const data = vehicles.slice(startIndex, startIndex + request.limit)

    return {
      data,
      meta: {
        page: request.page,
        limit: request.limit,
        total: vehicles.length,
        totalPages: Math.ceil(vehicles.length / request.limit),
      },
    }
  }

  public async getById(id: number): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findActiveById(id)
    if (vehicle === undefined) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found')
    }

    return vehicle
  }

  public async create(
    input: VehicleInput,
    photo?: UploadedPhoto,
  ): Promise<Vehicle> {
    const writeInput = this.toWriteInput(input)
    await this.assertPlateAvailable(writeInput.plateNumber)

    const photoPath = await this.savePhoto(photo)
    try {
      return await this.vehicleRepository.create({ ...writeInput, photoPath })
    } catch (error: unknown) {
      await this.removeNewPhoto(photoPath)
      throw this.toDuplicatePlateError(error)
    }
  }

  public async update(
    id: number,
    input: VehicleInput,
    photo?: UploadedPhoto,
  ): Promise<Vehicle> {
    const existingVehicle = await this.getById(id)
    const writeInput = this.toWriteInput(input)

    if (writeInput.plateNumber !== existingVehicle.plateNumber) {
      await this.assertPlateAvailable(writeInput.plateNumber, id)
    }

    const newPhotoPath = await this.savePhoto(photo)
    const photoPath = newPhotoPath ?? existingVehicle.photoPath

    try {
      const vehicle = await this.vehicleRepository.updateActive(id, {
        ...writeInput,
        photoPath,
      })
      if (vehicle === undefined) {
        throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found')
      }

      if (
        newPhotoPath !== undefined &&
        existingVehicle.photoPath !== undefined
      ) {
        await this.removeOldPhoto(existingVehicle.photoPath)
      }

      return vehicle
    } catch (error: unknown) {
      await this.removeNewPhoto(newPhotoPath)
      throw this.toDuplicatePlateError(error)
    }
  }

  public async delete(id: number): Promise<void> {
    const wasDeleted = await this.vehicleRepository.softDelete(id)
    if (!wasDeleted) {
      throw new AppError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found')
    }
  }

  public async getPhotoFilePath(id: number): Promise<string> {
    const vehicle = await this.getById(id)
    if (vehicle.photoPath === undefined || this.photoStorage === undefined) {
      throw new AppError(404, 'PHOTO_NOT_FOUND', 'Vehicle photo not found')
    }

    return this.photoStorage.getFilePath(vehicle.photoPath)
  }

  private toWriteInput(
    input: VehicleInput,
  ): Omit<VehicleWriteInput, 'photoPath'> {
    return {
      name: input.name.trim(),
      plateNumber: input.plateNumber.trim().toUpperCase(),
      category: input.category.trim(),
      dailyRate: input.dailyRate.toFixed(2),
    }
  }

  private async assertPlateAvailable(
    plateNumber: string,
    ignoredVehicleId?: number,
  ): Promise<void> {
    const existingVehicle =
      await this.vehicleRepository.findActiveByPlateNumber(plateNumber)

    if (
      existingVehicle !== undefined &&
      existingVehicle.id !== ignoredVehicleId
    ) {
      throw new AppError(
        409,
        'PLATE_NUMBER_EXISTS',
        'Plate number already exists',
      )
    }
  }

  private async savePhoto(photo?: UploadedPhoto): Promise<string | undefined> {
    if (photo === undefined) {
      return undefined
    }

    if (this.photoStorage === undefined) {
      throw new AppError(
        500,
        'PHOTO_STORAGE_UNAVAILABLE',
        'Photo storage unavailable',
      )
    }

    return this.photoStorage.save(photo)
  }

  private async removeNewPhoto(photoPath: string | undefined): Promise<void> {
    if (photoPath !== undefined && this.photoStorage !== undefined) {
      await this.photoStorage.remove(photoPath)
    }
  }

  private async removeOldPhoto(photoPath: string): Promise<void> {
    if (this.photoStorage === undefined) {
      return
    }

    try {
      await this.photoStorage.remove(photoPath)
    } catch {
      return
    }
  }

  private toDuplicatePlateError(error: unknown): unknown {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return new AppError(
        409,
        'PLATE_NUMBER_EXISTS',
        'Plate number already exists',
      )
    }

    return error
  }
}
