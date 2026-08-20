import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { AppError } from '../common/errors/app-error.js'

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024

export interface UploadedPhoto {
  buffer: Buffer
  mimetype: string
  size: number
}

const extensionByMimeType = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export function isAllowedPhotoMimeType(mimeType: string): boolean {
  return extensionByMimeType.has(mimeType)
}

export class PhotoStorage {
  private readonly uploadDirectory: string

  public constructor(uploadDirectory: string) {
    // Express response.sendFile requires an absolute path when serving photos.
    this.uploadDirectory = path.resolve(uploadDirectory)
  }

  public async save(photo: UploadedPhoto): Promise<string> {
    const extension = extensionByMimeType.get(photo.mimetype)
    if (extension === undefined || photo.size > MAX_PHOTO_SIZE_BYTES) {
      throw new AppError(422, 'INVALID_UPLOAD', 'Invalid vehicle photo')
    }

    await mkdir(this.uploadDirectory, { recursive: true })
    const fileName = `${randomUUID()}.${extension}`
    await writeFile(this.resolveFilePath(fileName), photo.buffer)
    return fileName
  }

  public async remove(fileName: string): Promise<void> {
    try {
      await rm(this.resolveFilePath(fileName))
    } catch (error: unknown) {
      if (isMissingFileError(error)) {
        return
      }
      throw error
    }
  }

  public getFilePath(fileName: string): string {
    return this.resolveFilePath(fileName)
  }

  private resolveFilePath(fileName: string): string {
    if (fileName.length === 0 || path.basename(fileName) !== fileName) {
      throw new AppError(404, 'PHOTO_NOT_FOUND', 'Vehicle photo not found')
    }

    return path.join(this.uploadDirectory, fileName)
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
