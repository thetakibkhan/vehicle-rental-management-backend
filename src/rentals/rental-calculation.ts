import { AppError } from '../common/errors/app-error.js'

const MINOR_UNITS_PER_AMOUNT = 100n

export function calculateRentalAmount(
  dailyRate: string,
  startDate: string,
  endDate: string,
): string {
  const rentalDays = calculateRentalDays(startDate, endDate)
  const amountInMinorUnits = parseAmountToMinorUnits(dailyRate)
  return formatMinorUnits(amountInMinorUnits * BigInt(rentalDays))
}

export function calculateRentalDays(
  startDate: string,
  endDate: string,
): number {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const differenceInMilliseconds = end.getTime() - start.getTime()

  if (differenceInMilliseconds < 0) {
    throw new AppError(
      422,
      'INVALID_DATE_RANGE',
      'End date must not be before start date',
    )
  }

  return differenceInMilliseconds / (24 * 60 * 60 * 1000) + 1
}

function parseAmountToMinorUnits(amount: string): bigint {
  const amountParts = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(amount)
  if (amountParts === null) {
    throw new Error('Vehicle daily rate is invalid')
  }

  const wholeAmount = amountParts[1]
  if (wholeAmount === undefined) {
    throw new Error('Vehicle daily rate is invalid')
  }
  const fraction = (amountParts[2] ?? '').padEnd(2, '0')
  return BigInt(wholeAmount) * MINOR_UNITS_PER_AMOUNT + BigInt(fraction)
}

function formatMinorUnits(amount: bigint): string {
  const wholeAmount = amount / MINOR_UNITS_PER_AMOUNT
  const fraction = (amount % MINOR_UNITS_PER_AMOUNT).toString().padStart(2, '0')
  return `${wholeAmount.toString()}.${fraction}`
}

function parseDate(value: string): Date {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (dateParts === null) {
    throw new AppError(
      422,
      'INVALID_DATE_RANGE',
      'Dates must be valid ISO dates',
    )
  }

  const year = Number(dateParts[1])
  const month = Number(dateParts[2])
  const day = Number(dateParts[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AppError(
      422,
      'INVALID_DATE_RANGE',
      'Dates must be valid ISO dates',
    )
  }

  return date
}
