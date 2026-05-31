import { parseTime } from './time'
import { GRACE_PERIOD_MINUTES, LATE_INCREMENT_MINUTES, LATE_DEDUCTION_PER_INCREMENT } from '../lib/constants'

/**
 * Compute late deduction hours.
 *
 * Rules:
 * - 15-minute grace period on time-in
 * - Over 15 minutes late → 0.25 hr deduction
 * - Over 30 minutes late → 0.50 hr deduction
 * - Continues in 15-min increments
 *
 * Formula: late_hours = CEIL((minutes_late - 15) / 15) * 0.25
 *          (when minutes_late > 15, otherwise 0)
 *
 * @param timeIn - Clock-in time "HH:MM"
 * @param scheduleStart - Scheduled start time "HH:MM"
 * @returns Late deduction in hours (e.g., 0.25, 0.50, 0.75...)
 */
export function computeLateHours(
  timeIn: string | null,
  scheduleStart: string
): number {
  if (!timeIn) return 0

  const inMin = parseTime(timeIn)
  const startMin = parseTime(scheduleStart)
  const minutesLate = inMin - startMin

  if (minutesLate <= GRACE_PERIOD_MINUTES) return 0

  // CEIL((minutesLate - 15) / 15) * 0.25
  const increments = Math.ceil((minutesLate - GRACE_PERIOD_MINUTES) / LATE_INCREMENT_MINUTES)
  return increments * LATE_DEDUCTION_PER_INCREMENT
}
