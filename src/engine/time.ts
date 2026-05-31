import type { WorkSchedule } from '../types/database'
import { WORKING_HOURS_PER_DAY } from '../lib/constants'

/**
 * Parse a time string "HH:MM" into total minutes from midnight.
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Format minutes from midnight into "HH:MM" string.
 */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Compute regular working hours for a day.
 * Caps at 8 hours (WORKING_HOURS_PER_DAY).
 * Excludes lunch break.
 *
 * Morning block: schedStart to 12:00 (noon)
 * Afternoon block: 13:00 to schedEnd (lunch excluded)
 */
export function computeRegularHours(
  timeIn: string | null,
  timeOut: string | null,
  schedule: WorkSchedule
): number {
  if (!timeIn || !timeOut) return 0

  const inMin = parseTime(timeIn)
  const outMin = parseTime(timeOut)
  const schedStart = parseTime(schedule.start)
  const schedEnd = parseTime(schedule.end)
  const lunchStart = 12 * 60 // 12:00
  const lunchEnd = lunchStart + schedule.lunch_minutes // 13:00

  if (outMin <= inMin) return 0

  // Effective clock boundaries capped to schedule
  const effectiveIn = Math.max(inMin, schedStart)
  const effectiveOut = Math.min(outMin, schedEnd)

  if (effectiveOut <= effectiveIn) return 0

  // Calculate hours worked excluding lunch
  let workedMinutes = 0

  if (effectiveOut <= lunchStart) {
    // All work is before lunch
    workedMinutes = effectiveOut - effectiveIn
  } else if (effectiveIn >= lunchEnd) {
    // All work is after lunch
    workedMinutes = effectiveOut - effectiveIn
  } else {
    // Work spans lunch break
    const morningMinutes = Math.max(0, lunchStart - effectiveIn)
    const afternoonMinutes = Math.max(0, effectiveOut - lunchEnd)
    workedMinutes = morningMinutes + afternoonMinutes
  }

  const hours = Math.min(workedMinutes / 60, 8)
  return Math.round(hours * 100) / 100
}

/**
 * Compute the scheduled rendered hours for a full day.
 * Example: 07:00 to 16:00 is 9 elapsed hours less 1 hour lunch = 8 hours.
 */
export function computeScheduledHours(schedule: WorkSchedule): number {
  const schedStart = parseTime(schedule.start)
  const schedEnd = parseTime(schedule.end)
  const scheduledMinutes = Math.max(0, schedEnd - schedStart - schedule.lunch_minutes)
  const hours = Math.min(scheduledMinutes / 60, WORKING_HOURS_PER_DAY)

  return Math.round(hours * 100) / 100
}

/**
 * Get daily rate from employee info.
 * Monthly employees: basic_pay / 24 by default.
 * The workspace payroll engine overrides this with the current month's
 * non-Sunday day count for semi-monthly payroll.
 * Daily employees: basic_pay (is already the daily rate)
 */
export function getDailyRate(basicPay: number, payType: 'monthly' | 'daily'): number {
  return payType === 'monthly' ? basicPay / 24 : basicPay
}

/**
 * Get hourly rate from daily rate.
 */
export function getHourlyRate(dailyRate: number): number {
  return dailyRate / 8
}
