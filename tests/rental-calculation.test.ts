import { describe, expect, it } from 'vitest'

import { calculateRentalAmount } from '../src/rentals/rental-calculation.js'

describe('calculateRentalAmount', () => {
  it('counts a same-day rental as one day', () => {
    expect(calculateRentalAmount('110.00', '2026-08-15', '2026-08-15')).toBe(
      '110.00',
    )
  })

  it('calculates using exact two-decimal minor units', () => {
    expect(calculateRentalAmount('70.00', '2026-07-29', '2026-08-03')).toBe(
      '420.00',
    )
  })
})
