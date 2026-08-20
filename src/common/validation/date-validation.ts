const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u
const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/u

export function isValidDateOnly(value: string): boolean {
  const parts = DATE_ONLY_PATTERN.exec(value)
  if (parts === null) return false

  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])

  if (!isValidYearAndMonth(year, month)) return false
  return day >= 1 && day <= daysInMonth(year, month)
}

export function isValidYearMonth(value: string): boolean {
  const parts = YEAR_MONTH_PATTERN.exec(value)
  if (parts === null) return false

  return isValidYearAndMonth(Number(parts[1]), Number(parts[2]))
}

function isValidYearAndMonth(year: number, month: number): boolean {
  return year >= 1 && month >= 1 && month <= 12
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30
  return 31
}

function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
}
