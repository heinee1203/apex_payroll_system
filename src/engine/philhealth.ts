import { PHILHEALTH_EE_SHARE, PHILHEALTH_ER_SHARE } from '../lib/constants'

export interface PhilHealthContribution {
  employee_share: number
  employer_share: number
  total: number
}

/**
 * Compute PhilHealth contribution.
 *
 * Fixed employee deduction per first-half payroll.
 *
 * @returns PhilHealth contribution amounts
 */
export function computePhilHealth(): PhilHealthContribution {
  const employee_share = PHILHEALTH_EE_SHARE
  const employer_share = PHILHEALTH_ER_SHARE
  const total = Math.round((employee_share + employer_share) * 100) / 100

  return { employee_share, employer_share, total }
}
