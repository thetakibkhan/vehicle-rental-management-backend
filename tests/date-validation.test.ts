import { describe, expect, it } from 'vitest'

import {
  isValidDateOnly,
  isValidYearMonth,
} from '../src/common/validation/date-validation.js'

describe('date validation', () => {
  it('rejects impossible calendar dates', () => {
    expect(isValidDateOnly('2099-02-30')).toBe(false)
  })

  it('accepts a valid leap day', () => {
    expect(isValidDateOnly('2028-02-29')).toBe(true)
  })

  it('rejects year zero in report months', () => {
    expect(isValidYearMonth('0000-01')).toBe(false)
  })
})
