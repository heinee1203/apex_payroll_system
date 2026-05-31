import { parseTime } from './time'
import { OT_INCREMENT_MINUTES, OT_HOURS_PER_INCREMENT } from '../lib/constants'

/**
 * Compute overtime hours.
 *
 * Rules:
 * - OT is calculated in 30-minute increments only
 * - Work beyond scheduled end time qualifies
 * - Formula: ot_hours = FLOOR((minutes_past_end) / 30) * 0.5
 * - ALL overtime is PENDING by default
 *
 * @param timeOut - Clock-out time "HH:MM"
 * @param scheduleEnd - Scheduled end time "HH:MM"
 * @returns Overtime hours (e.g., 0.5, 1.0, 1.5...)
 */
export function computeOvertimeHours(
  timeOut: string | null,
  scheduleEnd: string
): number {
  if (!timeOut) return 0

  const outMin = parseTime(timeOut)
  const endMin = parseTime(scheduleEnd)
  const minutesPastEnd = outMin - endMin

  if (minutesPastEnd <= 0) return 0

  const increments = Math.floor(minutesPastEnd / OT_INCREMENT_MINUTES)
  return increments * OT_HOURS_PER_INCREMENT
}
