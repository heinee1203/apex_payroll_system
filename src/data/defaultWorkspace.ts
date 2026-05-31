import type { SSSBracket } from '../types/database'
import type { EmployeeRecord, PayrollSettings, WorkspaceState } from '../engine/timeLogPayroll'
import {
  getCurrentSemiMonthlyPeriod,
  mergeMissingTimeLogs,
} from '../engine/timeLogPayroll'
import { COMPANY_NAME } from '../lib/constants'

export const DEFAULT_SSS_BRACKETS: SSSBracket[] = [
  { id: 1, range_low: 0, range_high: 4249.99, bracket: 4000, ee_share: 180, er_share: 380, ec: 10 },
  { id: 2, range_low: 4250, range_high: 4749.99, bracket: 4500, ee_share: 202.5, er_share: 427.5, ec: 10 },
  { id: 3, range_low: 4750, range_high: 5249.99, bracket: 5000, ee_share: 225, er_share: 475, ec: 10 },
  { id: 4, range_low: 5250, range_high: 5749.99, bracket: 5500, ee_share: 247.5, er_share: 522.5, ec: 10 },
  { id: 5, range_low: 5750, range_high: 6249.99, bracket: 6000, ee_share: 270, er_share: 570, ec: 10 },
  { id: 6, range_low: 6250, range_high: 6749.99, bracket: 6500, ee_share: 292.5, er_share: 617.5, ec: 10 },
  { id: 7, range_low: 6750, range_high: 7249.99, bracket: 7000, ee_share: 315, er_share: 665, ec: 10 },
  { id: 8, range_low: 7250, range_high: 7749.99, bracket: 7500, ee_share: 337.5, er_share: 712.5, ec: 10 },
  { id: 9, range_low: 7750, range_high: 8249.99, bracket: 8000, ee_share: 360, er_share: 760, ec: 10 },
  { id: 10, range_low: 8250, range_high: 8749.99, bracket: 8500, ee_share: 382.5, er_share: 807.5, ec: 10 },
  { id: 11, range_low: 8750, range_high: 9249.99, bracket: 9000, ee_share: 405, er_share: 855, ec: 10 },
  { id: 12, range_low: 9250, range_high: 9749.99, bracket: 9500, ee_share: 427.5, er_share: 902.5, ec: 10 },
  { id: 13, range_low: 9750, range_high: 10249.99, bracket: 10000, ee_share: 450, er_share: 950, ec: 10 },
  { id: 14, range_low: 10250, range_high: 10749.99, bracket: 10500, ee_share: 472.5, er_share: 997.5, ec: 10 },
  { id: 15, range_low: 10750, range_high: 11249.99, bracket: 11000, ee_share: 495, er_share: 1045, ec: 10 },
  { id: 16, range_low: 11250, range_high: 11749.99, bracket: 11500, ee_share: 517.5, er_share: 1092.5, ec: 10 },
  { id: 17, range_low: 11750, range_high: 12249.99, bracket: 12000, ee_share: 540, er_share: 1140, ec: 10 },
  { id: 18, range_low: 12250, range_high: 12749.99, bracket: 12500, ee_share: 562.5, er_share: 1187.5, ec: 10 },
  { id: 19, range_low: 12750, range_high: 13249.99, bracket: 13000, ee_share: 585, er_share: 1235, ec: 10 },
  { id: 20, range_low: 13250, range_high: 13749.99, bracket: 13500, ee_share: 607.5, er_share: 1282.5, ec: 10 },
  { id: 21, range_low: 13750, range_high: 14249.99, bracket: 14000, ee_share: 630, er_share: 1330, ec: 10 },
  { id: 22, range_low: 14250, range_high: 14749.99, bracket: 14500, ee_share: 652.5, er_share: 1377.5, ec: 10 },
  { id: 23, range_low: 14750, range_high: 15249.99, bracket: 15000, ee_share: 675, er_share: 1425, ec: 30 },
  { id: 24, range_low: 15250, range_high: 15749.99, bracket: 15500, ee_share: 697.5, er_share: 1472.5, ec: 30 },
  { id: 25, range_low: 15750, range_high: 16249.99, bracket: 16000, ee_share: 720, er_share: 1520, ec: 30 },
  { id: 26, range_low: 16250, range_high: 16749.99, bracket: 16500, ee_share: 742.5, er_share: 1567.5, ec: 30 },
  { id: 27, range_low: 16750, range_high: 17249.99, bracket: 17000, ee_share: 765, er_share: 1615, ec: 30 },
  { id: 28, range_low: 17250, range_high: 17749.99, bracket: 17500, ee_share: 787.5, er_share: 1662.5, ec: 30 },
  { id: 29, range_low: 17750, range_high: 18249.99, bracket: 18000, ee_share: 810, er_share: 1710, ec: 30 },
  { id: 30, range_low: 18250, range_high: 18749.99, bracket: 18500, ee_share: 832.5, er_share: 1757.5, ec: 30 },
  { id: 31, range_low: 18750, range_high: 19249.99, bracket: 19000, ee_share: 855, er_share: 1805, ec: 30 },
  { id: 32, range_low: 19250, range_high: 19749.99, bracket: 19500, ee_share: 877.5, er_share: 1852.5, ec: 30 },
  { id: 33, range_low: 19750, range_high: 20249.99, bracket: 20000, ee_share: 900, er_share: 1900, ec: 30 },
  { id: 34, range_low: 20250, range_high: 20749.99, bracket: 20500, ee_share: 922.5, er_share: 1947.5, ec: 30 },
  { id: 35, range_low: 20750, range_high: 21249.99, bracket: 21000, ee_share: 945, er_share: 1995, ec: 30 },
  { id: 36, range_low: 21250, range_high: 21749.99, bracket: 21500, ee_share: 967.5, er_share: 2042.5, ec: 30 },
  { id: 37, range_low: 21750, range_high: 22249.99, bracket: 22000, ee_share: 990, er_share: 2090, ec: 30 },
  { id: 38, range_low: 22250, range_high: 22749.99, bracket: 22500, ee_share: 1012.5, er_share: 2137.5, ec: 30 },
  { id: 39, range_low: 22750, range_high: 23249.99, bracket: 23000, ee_share: 1150, er_share: 2300, ec: 30 },
]

export const DEFAULT_EMPLOYEES: EmployeeRecord[] = [
  makeEmployee('emp-001', 'ALA-001', 'ADAN, RONALYN', 'Teacher', 14500),
  makeEmployee('emp-002', 'ALA-002', 'AVENGOZA, DANIELA LOURDES', 'Teacher', 14500),
  makeEmployee('emp-003', 'ALA-003', 'BORBE, DESIREE', 'Teacher', 14500),
  makeEmployee('emp-004', 'ALA-004', 'CANDIA, DENZEL', 'Teacher', 15000, { loanDeduction: 1500 }),
  makeEmployee('emp-005', 'ALA-005', 'CARASCAL, MA. VERONICA', 'Teacher', 18500),
  makeEmployee('emp-006', 'ALA-006', 'EBUENGA, ROSALYN', 'Teacher', 14500),
  makeEmployee('emp-007', 'ALA-007', 'MATUS, LANDER', 'Utility', 350, { payType: 'daily' }),
  makeEmployee('emp-008', 'ALA-008', 'SOLTES, FRANCE ABBYGAIL', 'Teacher', 14500),
  makeEmployee('emp-009', 'ALA-009', 'VALENCIA, MARIA VILMA', 'Teacher', 14500, {
    schedule: { start: '07:30', end: '16:30', lunch_minutes: 60 },
  }),
  makeEmployee('emp-010', 'ALA-010', 'CABRAL, MARIA NINA', 'Administrator', 20000),
  makeEmployee('emp-011', 'ALA-011', 'PRESTADO, CHRISTINE', 'Teacher', 14500, { saturdayPaid: false }),
]

export function createDefaultWorkspace(): WorkspaceState {
  const period = getCurrentSemiMonthlyPeriod()
  const settings: PayrollSettings = {
    companyName: COMPANY_NAME,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    deductSSS: true,
    deductPhilHealth: true,
    deductPagIbig: true,
  }

  return {
    employees: DEFAULT_EMPLOYEES,
    logs: mergeMissingTimeLogs([], DEFAULT_EMPLOYEES, settings),
    settings,
    depositSlips: [],
  }
}

function makeEmployee(
  id: string,
  code: string,
  name: string,
  role: string,
  basicPay: number,
  overrides: Partial<EmployeeRecord> = {}
): EmployeeRecord {
  return {
    id,
    code,
    name,
    role,
    payType: 'monthly',
    basicPay,
    schedule: { start: '07:00', end: '16:00', lunch_minutes: 60 },
    saturdayPaid: true,
    sssEnabled: true,
    philHealthEnabled: true,
    pagIbigEnabled: true,
    loanDeduction: 0,
    adjustment: 0,
    active: true,
    ...overrides,
  }
}
