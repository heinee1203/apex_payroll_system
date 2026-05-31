/**
 * Format a number as Philippine Peso currency.
 * e.g., 14500 → "₱14,500.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date string to a readable format.
 * e.g., "2026-03-01" → "Mar 1, 2026"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date string to short format.
 * e.g., "2026-03-01" → "Mar 1"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get the day name from a date string.
 * e.g., "2026-03-01" → "Sun"
 */
export function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-PH', { weekday: 'short' })
}

/**
 * Get the day of week (0=Sunday, 6=Saturday).
 */
export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

/**
 * Format a pay period label.
 * e.g., (2026, 3, '1st_half') → "Mar 1-15, 2026"
 */
export function formatPayPeriodLabel(
  year: number,
  month: number,
  periodType: '1st_half' | '2nd_half',
  endDate?: string
): string {
  const monthName = new Date(year, month - 1).toLocaleDateString('en-PH', { month: 'short' })

  if (periodType === '1st_half') {
    return `${monthName} 1-15, ${year}`
  }

  const lastDay = endDate
    ? new Date(endDate + 'T00:00:00').getDate()
    : new Date(year, month, 0).getDate()
  return `${monthName} 16-${lastDay}, ${year}`
}

/**
 * Format hours for display.
 * e.g., 0.25 → "0.25", 8 → "8.00"
 */
export function formatHours(hours: number): string {
  return hours.toFixed(2)
}

/**
 * Format a time string for display.
 * e.g., "07:00" → "7:00 AM", "16:00" → "4:00 PM"
 */
export function formatTimeDisplay(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}
