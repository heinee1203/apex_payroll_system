import { PAGIBIG_EE_SHARE, PAGIBIG_ER_SHARE } from '../lib/constants'

export interface PagIBIGContribution {
  employee_share: number
  employer_share: number
}

/**
 * Compute Pag-IBIG contribution.
 *
 * Fixed: ₱200/month (₱100 EE + ₱100 ER) for most brackets.
 *
 * @returns Pag-IBIG contribution amounts
 */
export function computePagIBIG(): PagIBIGContribution {
  return {
    employee_share: PAGIBIG_EE_SHARE,
    employer_share: PAGIBIG_ER_SHARE,
  }
}
