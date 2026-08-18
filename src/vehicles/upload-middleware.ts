import multer from 'multer'
import type { Request } from 'express'

import { AppError } from '../common/errors/app-error.js'
import {
  isAllowedPhotoMimeType,
  MAX_PHOTO_SIZE_BYTES,
} from './photo-storage.js'

export const uploadVehiclePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES, files: 1 },
  fileFilter: (
    _request: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback,
  ): void => {
    if (!isAllowedPhotoMimeType(file.mimetype)) {
      callback(new AppError(422, 'INVALID_UPLOAD', 'Invalid vehicle photo'))
      return
    }

    callback(null, true)
  },
}).single('photo')
