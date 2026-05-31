import type { SSSBracket } from '../types/database'

export interface SSSContribution {
  ee_share: number
  er_share: number
  ec: number
}

/**
 * Lookup SSS contribution based on monthly basic pay.
 * Finds the bracket where range_low <= basicPay <= range_high.
 *
 * @param monthlyBasicPay - Employee's monthly basic pay
 * @param brackets - SSS contribution table (sorted by range_low)
 * @returns SSS contribution amounts
 */
export function lookupSSS(
  monthlyBasicPay: number,
  brackets: SSSBracket[]
): SSSContribution {
  // Find matching bracket
  const bracket = brackets.find(
    (b) => monthlyBasicPay >= b.range_low && monthlyBasicPay <= b.range_high
  )

  if (!bracket) {
    // If salary exceeds all brackets, use the highest bracket
    const highest = brackets[brackets.length - 1]
    if (highest && monthlyBasicPay > highest.range_high) {
      return {
        ee_share: highest.ee_share,
        er_share: highest.er_share,
        ec: highest.ec,
      }
    }
    return { ee_share: 0, er_share: 0, ec: 0 }
  }

  return {
    ee_share: bracket.ee_share,
    er_share: bracket.er_share,
    ec: bracket.ec,
  }
}
