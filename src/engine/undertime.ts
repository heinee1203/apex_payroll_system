import { parseTime } from './time'
import { UT_INCREMENT_MINUTES, UT_DEDUCTION_PER_INCREMENT } from '../lib/constants'

/**
 * Compute undertime hours.
 *
 * Rules:
 * - Early clock-out before scheduled end time
 * - Computed in 0.25-hour (15-min) increments
 * - Formula: ut_hours = CEIL(minutes_early / 15) * 0.25
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

  if (minutesEarly <= 0) return 0

  const increments = Math.ceil(minutesEarly / UT_INCREMENT_MINUTES)
  return increments * UT_DEDUCTION_PER_INCREMENT
}
