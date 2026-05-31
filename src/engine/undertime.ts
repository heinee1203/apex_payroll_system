import { parseTime } from './time'
import { GRACE_PERIOD_MINUTES, UT_INCREMENT_MINUTES, UT_DEDUCTION_PER_INCREMENT } from '../lib/constants'

/**
 * Compute undertime hours.
 *
 * Rules:
 * - Early clock-out before scheduled end time
 * - A 15-minute grace period is free
 * - After grace, computed in 15-minute bands:
 *   16-29 = 0.25 hr, 30-44 = 0.50 hr, 45-59 = 0.75 hr
 *
 * @param timeOut - Clock-out time "HH:MM"
 * @param scheduleEnd - Scheduled end time "HH:MM"
 * @returns Undertime deduction in hours (e.g., 0.25, 0.50...)
 */
export function computeUndertimeHours(
  timeOut: string | null,
  scheduleEnd: string
): number {
  if (!timeOut) return 0

  const outMin = parseTime(timeOut)
  const endMin = parseTime(scheduleEnd)
  const minutesEarly = endMin - outMin

  if (minutesEarly <= GRACE_PERIOD_MINUTES) return 0

  const increments = Math.floor(minutesEarly / UT_INCREMENT_MINUTES)
  return increments * UT_DEDUCTION_PER_INCREMENT
}
