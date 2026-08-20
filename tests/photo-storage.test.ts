import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import { PhotoStorage } from '../src/vehicles/photo-storage.js'

describe('PhotoStorage', () => {
  it('resolves relative upload directories to absolute file paths', async () => {
    const uploadDirectory = await mkdtemp(
      path.join(tmpdir(), 'vehicle-photo-storage-'),
    )
    const relativeUploadDirectory = path.relative(
      process.cwd(),
      uploadDirectory,
    )

    try {
      const storage = new PhotoStorage(relativeUploadDirectory)
      const filePath = storage.getFilePath('vehicle.jpg')

      expect(path.isAbsolute(filePath)).toBe(true)
      expect(filePath).toBe(path.join(uploadDirectory, 'vehicle.jpg'))
    } finally {
      await rm(uploadDirectory, { recursive: true, force: true })
    }
  })
})
