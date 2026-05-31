import { PHILHEALTH_RATE } from '../lib/constants'

export interface PhilHealthContribution {
  employee_share: number
  employer_share: number
  total: number
}

/**
 * Compute PhilHealth contribution.
 *
 * Formula: monthly_premium = basic_pay x 0.05
 *          employee_share = premium / 2
 *
 * @param monthlyBasicPay - Employee's monthly basic pay
 * @returns PhilHealth contribution amounts
 */
export function computePhilHealth(monthlyBasicPay: number): PhilHealthContribution {
  const total = Math.round(monthlyBasicPay * PHILHEALTH_RATE * 100) / 100
  const employee_share = Math.round((total / 2) * 100) / 100
  const employer_share = Math.round((total - employee_share) * 100) / 100

  return { employee_share, employer_share, total }
}
