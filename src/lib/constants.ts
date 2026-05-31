// Company
export const COMPANY_NAME = 'Apex Learning Academy, Inc.'
export const COMPANY_SHORT = 'ALA'
export const EMPLOYEE_CODE_PREFIX = 'ALA'

// Working hours
export const DEFAULT_SCHEDULE = {
  start: '07:00',
  end: '16:00',
  lunch_minutes: 60,
}
export const WORKING_HOURS_PER_DAY = 8
export const WORKING_DAYS_PER_MONTH = 24

// Late rules
export const GRACE_PERIOD_MINUTES = 15
export const LATE_INCREMENT_MINUTES = 15
export const LATE_DEDUCTION_PER_INCREMENT = 0.25 // hours

// Overtime rules
export const OT_INCREMENT_MINUTES = 30
export const OT_HOURS_PER_INCREMENT = 0.5
export const OT_RATE_MULTIPLIER = 1.25

// Undertime rules
export const UT_INCREMENT_MINUTES = 15
export const UT_DEDUCTION_PER_INCREMENT = 0.25 // hours

// Government contributions
export const PAGIBIG_EE_SHARE = 100
export const PAGIBIG_ER_SHARE = 100
export const PHILHEALTH_RATE = 0.05

// Remarks options
export const REMARK_OPTIONS = [
  'ABSENT',
  'HOLIDAY',
  'TUTORIAL',
  'TRAINING',
  'LEAVE',
  'CONDOLENCE',
  'DEPED MEETING',
  'CLASS SUSPENSION',
  'SHORTENED DAY',
  'SICK LEAVE',
  'VACATION LEAVE',
] as const

// Pay period statuses
export const PAY_PERIOD_STATUSES = ['draft', 'processing', 'locked', 'paid'] as const
export const PAYROLL_STATUSES = ['draft', 'approved', 'paid'] as const
