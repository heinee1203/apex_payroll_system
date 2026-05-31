import type { SSSBracket } from '../types/database'
import { computeLateHours } from './late'
import { computeOvertimeHours } from './overtime'
import { computePagIBIG } from './pagibig'
import { computePhilHealth } from './philhealth'
import { getDailyRate, getHourlyRate, computeRegularHours } from './time'
import { computeUndertimeHours } from './undertime'
import { lookupSSS } from './sss'
import { OT_RATE_MULTIPLIER } from '../lib/constants'

export type PayType = 'monthly' | 'daily'
export type TimeLogStatus = 'present' | 'absent' | 'paid_leave' | 'holiday' | 'rest_day'
export type WorkspaceView = 'logs' | 'payroll' | 'employees' | 'settings'

export interface WorkSchedule {
  start: string
  end: string
  lunch_minutes: number
}

export interface EmployeeRecord {
  id: string
  code: string
  name: string
  role: string
  payType: PayType
  basicPay: number
  schedule: WorkSchedule
  saturdayPaid: boolean
  sssEnabled: boolean
  philHealthEnabled: boolean
  pagIbigEnabled: boolean
  loanDeduction: number
  adjustment: number
  active: boolean
}

export interface TimeLogEntry {
  id: string
  employeeId: string
  date: string
  status: TimeLogStatus
  timeIn: string
  timeOut: string
  otApproved: boolean
  notes: string
}

export interface PayrollSettings {
  companyName: string
  periodStart: string
  periodEnd: string
  deductSSS: boolean
  deductPhilHealth: boolean
  deductPagIbig: boolean
}

export interface WorkspaceState {
  employees: EmployeeRecord[]
  logs: TimeLogEntry[]
  settings: PayrollSettings
}

export interface DailyComputation {
  regularHours: number
  lateHours: number
  undertimeHours: number
  overtimeHours: number
  paidDay: boolean
  absentDay: boolean
  incomplete: boolean
}

export interface PayrollSummary {
  employee: EmployeeRecord
  paidDays: number
  absences: number
  incompleteDays: number
  regularHours: number
  lateHours: number
  undertimeHours: number
  overtimeHours: number
  grossPay: number
  overtimePay: number
  lateDeduction: number
  undertimeDeduction: number
  absenceDeduction: number
  sss: number
  philHealth: number
  pagIbig: number
  loanDeduction: number
  adjustment: number
  totalDeductions: number
  netPay: number
  dailyRate: number
  hourlyRate: number
}

export interface WorkspaceTotals {
  grossPay: number
  overtimePay: number
  deductions: number
  netPay: number
  employees: number
  incompleteDays: number
  overtimeHours: number
}

export const STATUS_LABELS: Record<TimeLogStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  paid_leave: 'Paid Leave',
  holiday: 'Holiday',
  rest_day: 'Rest Day',
}

export const HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-01-29': 'Chinese New Year',
  '2026-02-25': 'EDSA Anniversary',
  '2026-04-01': 'Maundy Thursday',
  '2026-04-02': 'Good Friday',
  '2026-04-03': 'Black Saturday',
  '2026-04-09': 'Araw ng Kagitingan',
  '2026-05-01': 'Labor Day',
  '2026-06-12': 'Independence Day',
  '2026-08-31': 'National Heroes Day',
  '2026-11-30': 'Bonifacio Day',
  '2026-12-25': 'Christmas Day',
  '2026-12-30': 'Rizal Day',
}

const roundMoney = (value: number) => Math.round(value * 100) / 100
const roundHours = (value: number) => Math.round(value * 100) / 100

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCurrentSemiMonthlyPeriod(today = new Date()) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startDay = day <= 15 ? 1 : 16
  const endDay = day <= 15 ? 15 : lastDay

  return {
    periodStart: toDateKey(new Date(year, month, startDay)),
    periodEnd: toDateKey(new Date(year, month, endDay)),
  }
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = parseDateKey(startDate)
  const end = parseDateKey(endDate)

  while (current <= end) {
    dates.push(toDateKey(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function getDayName(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-PH', { weekday: 'short' })
}

export function isWeekend(dateKey: string): boolean {
  const day = parseDateKey(dateKey).getDay()
  return day === 0 || day === 6
}

export function getDefaultStatusForDate(employee: EmployeeRecord, dateKey: string): TimeLogStatus {
  const day = parseDateKey(dateKey).getDay()

  if (day === 0) return 'rest_day'
  if (day === 6 && !employee.saturdayPaid) return 'rest_day'
  if (HOLIDAYS_2026[dateKey]) return 'holiday'

  return 'present'
}

export function makeTimeLog(employee: EmployeeRecord, date: string): TimeLogEntry {
  const status = getDefaultStatusForDate(employee, date)

  return {
    id: `${employee.id}-${date}`,
    employeeId: employee.id,
    date,
    status,
    timeIn: status === 'present' ? employee.schedule.start : '',
    timeOut: status === 'present' ? employee.schedule.end : '',
    otApproved: false,
    notes: HOLIDAYS_2026[date] || '',
  }
}

export function mergeMissingTimeLogs(
  logs: TimeLogEntry[],
  employees: EmployeeRecord[],
  settings: Pick<PayrollSettings, 'periodStart' | 'periodEnd'>
): TimeLogEntry[] {
  const activeEmployees = employees.filter((employee) => employee.active)
  const dates = generateDateRange(settings.periodStart, settings.periodEnd)
  const existing = new Set(logs.map((log) => `${log.employeeId}-${log.date}`))
  const additions: TimeLogEntry[] = []

  for (const employee of activeEmployees) {
    for (const date of dates) {
      const key = `${employee.id}-${date}`
      if (!existing.has(key)) {
        additions.push(makeTimeLog(employee, date))
      }
    }
  }

  return additions.length ? [...logs, ...additions] : logs
}

export function computeDailyLog(employee: EmployeeRecord, log: TimeLogEntry): DailyComputation {
  if (log.status === 'rest_day') {
    return {
      regularHours: 0,
      lateHours: 0,
      undertimeHours: 0,
      overtimeHours: 0,
      paidDay: false,
      absentDay: false,
      incomplete: false,
    }
  }

  if (log.status === 'absent') {
    return {
      regularHours: 0,
      lateHours: 0,
      undertimeHours: 0,
      overtimeHours: 0,
      paidDay: false,
      absentDay: true,
      incomplete: false,
    }
  }

  if (log.status === 'paid_leave' || log.status === 'holiday') {
    return {
      regularHours: 8,
      lateHours: 0,
      undertimeHours: 0,
      overtimeHours: 0,
      paidDay: true,
      absentDay: false,
      incomplete: false,
    }
  }

  const incomplete = !log.timeIn || !log.timeOut
  const regularHours = incomplete
    ? 0
    : computeRegularHours(log.timeIn, log.timeOut, employee.schedule)
  const overtimeHours = log.otApproved && !incomplete
    ? computeOvertimeHours(log.timeOut, employee.schedule.end)
    : 0

  return {
    regularHours,
    lateHours: incomplete ? 0 : computeLateHours(log.timeIn, employee.schedule.start),
    undertimeHours: incomplete ? 0 : computeUndertimeHours(log.timeOut, employee.schedule.end),
    overtimeHours,
    paidDay: regularHours > 0,
    absentDay: false,
    incomplete,
  }
}

export function computeEmployeePayroll(
  employee: EmployeeRecord,
  logs: TimeLogEntry[],
  settings: PayrollSettings,
  sssBrackets: SSSBracket[]
): PayrollSummary {
  const dailyRate = getDailyRate(employee.basicPay, employee.payType)
  const hourlyRate = getHourlyRate(dailyRate)
  const monthlyEquivalent = employee.payType === 'monthly' ? employee.basicPay : dailyRate * 24

  let paidDays = 0
  let absences = 0
  let incompleteDays = 0
  let regularHours = 0
  let lateHours = 0
  let undertimeHours = 0
  let overtimeHours = 0

  for (const log of logs) {
    const day = computeDailyLog(employee, log)
    if (day.paidDay) paidDays += 1
    if (day.absentDay) absences += 1
    if (day.incomplete) incompleteDays += 1
    regularHours += day.regularHours
    lateHours += day.lateHours
    undertimeHours += day.undertimeHours
    overtimeHours += day.overtimeHours
  }

  const grossPay = employee.payType === 'monthly'
    ? roundMoney(employee.basicPay / 2)
    : roundMoney(paidDays * dailyRate)
  const overtimePay = roundMoney(overtimeHours * hourlyRate * OT_RATE_MULTIPLIER)
  const lateDeduction = roundMoney(lateHours * hourlyRate)
  const undertimeDeduction = roundMoney(undertimeHours * hourlyRate)
  const absenceDeduction = employee.payType === 'monthly'
    ? roundMoney(absences * dailyRate)
    : 0

  const sss = settings.deductSSS && employee.sssEnabled
    ? lookupSSS(monthlyEquivalent, sssBrackets).ee_share
    : 0
  const philHealth = settings.deductPhilHealth && employee.philHealthEnabled
    ? computePhilHealth(monthlyEquivalent).employee_share
    : 0
  const pagIbig = settings.deductPagIbig && employee.pagIbigEnabled
    ? computePagIBIG().employee_share
    : 0
  const loanDeduction = Math.max(0, employee.loanDeduction)
  const adjustment = employee.adjustment

  const totalDeductions = roundMoney(
    lateDeduction + undertimeDeduction + absenceDeduction + sss + philHealth + pagIbig + loanDeduction
  )
  const netPay = roundMoney(grossPay + overtimePay + adjustment - totalDeductions)

  return {
    employee,
    paidDays,
    absences,
    incompleteDays,
    regularHours: roundHours(regularHours),
    lateHours: roundHours(lateHours),
    undertimeHours: roundHours(undertimeHours),
    overtimeHours: roundHours(overtimeHours),
    grossPay,
    overtimePay,
    lateDeduction,
    undertimeDeduction,
    absenceDeduction,
    sss,
    philHealth,
    pagIbig,
    loanDeduction,
    adjustment,
    totalDeductions,
    netPay,
    dailyRate,
    hourlyRate,
  }
}

export function computeWorkspaceTotals(summaries: PayrollSummary[]): WorkspaceTotals {
  return summaries.reduce(
    (totals, summary) => ({
      grossPay: roundMoney(totals.grossPay + summary.grossPay),
      overtimePay: roundMoney(totals.overtimePay + summary.overtimePay),
      deductions: roundMoney(totals.deductions + summary.totalDeductions),
      netPay: roundMoney(totals.netPay + summary.netPay),
      employees: totals.employees + 1,
      incompleteDays: totals.incompleteDays + summary.incompleteDays,
      overtimeHours: roundHours(totals.overtimeHours + summary.overtimeHours),
    }),
    {
      grossPay: 0,
      overtimePay: 0,
      deductions: 0,
      netPay: 0,
      employees: 0,
      incompleteDays: 0,
      overtimeHours: 0,
    }
  )
}

export function normalizeStatus(value: string): TimeLogStatus {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')

  if (normalized === 'absent' || normalized === 'a') return 'absent'
  if (normalized === 'leave' || normalized === 'paid_leave' || normalized === 'paidleave') return 'paid_leave'
  if (normalized === 'holiday' || normalized === 'h') return 'holiday'
  if (normalized === 'rest' || normalized === 'rest_day' || normalized === 'off') return 'rest_day'

  return 'present'
}
