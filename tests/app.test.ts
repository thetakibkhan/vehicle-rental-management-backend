import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'

describe('createApp', () => {
  it('reports that the API process is healthy', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    })
  })

  it('returns a consistent response for unknown routes', async () => {
    const response = await request(createApp()).get('/missing')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  })

  it('returns a client error for malformed JSON', async () => {
    const response = await request(createApp())
      .post('/missing')
      .set('Content-Type', 'application/json')
      .send('{"broken":')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Malformed JSON request body' },
    })
  })
})
