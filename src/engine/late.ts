import { parseTime } from './time'
import { GRACE_PERIOD_MINUTES, LATE_DEDUCTION_PER_INCREMENT, LATE_INCREMENT_MINUTES } from '../lib/constants'

/**
 * Compute late deduction hours.
 *
 * A 15-minute grace period is free. After that, late time is rounded down
 * into 15-minute bands: 16-29 = 0.25 hr, 30-44 = 0.50 hr, 45-59 = 0.75 hr.
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

  const increments = Math.floor(minutesLate / LATE_INCREMENT_MINUTES)
  return increments * LATE_DEDUCTION_PER_INCREMENT
}
