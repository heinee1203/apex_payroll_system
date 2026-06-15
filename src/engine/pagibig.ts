import { PAGIBIG_EE_SHARE, PAGIBIG_ER_SHARE } from '../lib/constants'

export interface PagIBIGContribution {
  employee_share: number
  employer_share: number
}

/**
 * Compute Pag-IBIG contribution.
 *
 * Fixed employee deduction per first-half payroll.
 *
 * @returns Pag-IBIG contribution amounts
 */
export function computePagIBIG(): PagIBIGContribution {
  return {
    employee_share: PAGIBIG_EE_SHARE,
    employer_share: PAGIBIG_ER_SHARE,
  }
}
