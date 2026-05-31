import type { Employee, TimeEntry, PayPeriod, Loan, SSSBracket } from '../types/database'
import { getDailyRate, getHourlyRate } from './time'
import { lookupSSS } from './sss'
import { computePhilHealth } from './philhealth'
import { computePagIBIG } from './pagibig'
import { OT_RATE_MULTIPLIER } from '../lib/constants'

export interface PayrollResult {
  effectiveGross: number
  totalDaysWorked: number
  totalAbsences: number
  totalOtHours: number
  otAmount: number
  totalLateHours: number
  lateAmount: number
  totalUtHours: number
  utAmount: number
  absenceDeduction: number
  adjustmentAmount: number
  sssEE: number
  philhealthEE: number
  pagibigEE: number
  totalLoanDeductions: number
  totalDeductions: number
  netPay: number
  dailyRate: number
  hourlyRate: number
}

/**
 * Core payroll computation engine.
 *
 * Computes gross salary, all deductions, and net pay for one employee for one pay period.
 * All logic is pure — no database calls, no side effects.
 */
export function computePayroll(
  employee: Employee,
  payPeriod: PayPeriod,
  timeEntries: TimeEntry[],
  activeLoans: Loan[],
  sssBrackets: SSSBracket[],
  adjustmentAmount: number = 0
): PayrollResult {
  const isMonthly = employee.pay_type === 'monthly'
  const dailyRate = getDailyRate(employee.basic_pay, employee.pay_type)
  const hourlyRate = getHourlyRate(dailyRate)

  // Semi-monthly gross (before deductions)
  const grossSalary = isMonthly ? employee.basic_pay / 2 : 0

  let totalDaysWorked = 0
  let totalAbsences = 0
  let totalOtHours = 0  // only approved OT
  let totalLateHours = 0
  let totalUtHours = 0

  for (const entry of timeEntries) {
    if (entry.total_hours > 0) totalDaysWorked++
    if (entry.is_absent) totalAbsences++
    if (entry.ot_approved) totalOtHours += entry.ot_hours
    totalLateHours += entry.late_hours
    totalUtHours += entry.ut_hours
  }

  // For daily-rate employees, gross = days x daily_rate
  const effectiveGross = isMonthly ? grossSalary : totalDaysWorked * dailyRate

  const otAmount = Math.round(totalOtHours * hourlyRate * OT_RATE_MULTIPLIER * 100) / 100
  const lateAmount = Math.round(totalLateHours * hourlyRate * 100) / 100
  const utAmount = Math.round(totalUtHours * hourlyRate * 100) / 100
  const absenceDeduction = Math.round(totalAbsences * dailyRate * 100) / 100

  // Government contributions (if toggled ON for this period)
  let sssEE = 0
  let philhealthEE = 0
  let pagibigEE = 0

  if (payPeriod.sss_deduction) {
    sssEE = lookupSSS(employee.basic_pay, sssBrackets).ee_share
  }
  if (payPeriod.philhealth_deduct) {
    philhealthEE = computePhilHealth(employee.basic_pay).employee_share
  }
  if (payPeriod.pagibig_deduct) {
    pagibigEE = computePagIBIG().employee_share
  }

  // Loan deductions
  let totalLoanDeductions = 0
  for (const loan of activeLoans) {
    const deduction = Math.min(loan.monthly_deduction, loan.balance)
    totalLoanDeductions += deduction
  }
  totalLoanDeductions = Math.round(totalLoanDeductions * 100) / 100

  const totalDeductions = Math.round(
    (lateAmount + utAmount + absenceDeduction + sssEE + philhealthEE + pagibigEE + totalLoanDeductions) * 100
  ) / 100

  const netPay = Math.round(
    (effectiveGross + otAmount + adjustmentAmount - totalDeductions) * 100
  ) / 100

  return {
    effectiveGross,
    totalDaysWorked,
    totalAbsences,
    totalOtHours,
    otAmount,
    totalLateHours,
    lateAmount,
    totalUtHours,
    utAmount,
    absenceDeduction,
    adjustmentAmount,
    sssEE,
    philhealthEE,
    pagibigEE,
    totalLoanDeductions,
    totalDeductions,
    netPay,
    dailyRate,
    hourlyRate,
  }
}
