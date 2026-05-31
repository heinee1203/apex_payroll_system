export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EmployeeStatus = 'active' | 'inactive' | 'terminated'
export type PayType = 'monthly' | 'daily'
export type PeriodType = '1st_half' | '2nd_half'
export type PayPeriodStatus = 'draft' | 'processing' | 'locked' | 'paid'
export type DayType = 'regular' | 'sunday' | 'saturday' | 'holiday' | 'special'
export type PayrollStatus = 'draft' | 'approved' | 'paid'
export type LoanType = 'sss_loan' | 'hdmf_loan' | 'cash_advance' | 'grocery_loan' | 'cp_loan' | 'other'
export type LoanStatus = 'active' | 'completed' | 'cancelled'
export type HolidayType = 'regular' | 'special_non_working' | 'special_working'

export interface WorkSchedule {
  start: string // "07:00"
  end: string   // "16:00"
  lunch_minutes: number
}

export interface Employee {
  id: string
  employee_code: string
  last_name: string
  first_name: string
  middle_name: string | null
  basic_pay: number
  pay_type: PayType
  work_schedule: WorkSchedule
  bank_name: string | null
  bank_account_no: string | null
  sss_no: string | null
  philhealth_no: string | null
  pagibig_no: string | null
  tin_no: string | null
  date_hired: string | null
  status: EmployeeStatus
  location: string | null
  notes: string | null
  saturday_pay: boolean
  created_at: string
  updated_at: string
}

export interface PayPeriod {
  id: string
  year: number
  month: number
  period_type: PeriodType
  start_date: string
  end_date: string
  working_days: number | null
  saturday_count: number | null
  status: PayPeriodStatus
  sss_deduction: boolean
  philhealth_deduct: boolean
  pagibig_deduct: boolean
  created_at: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  pay_period_id: string
  entry_date: string
  day_of_month: number
  day_type: DayType
  time_in: string | null
  time_out: string | null
  total_hours: number
  ot_hours: number
  ot_approved: boolean
  ut_hours: number
  late_hours: number
  remarks: string | null
  is_absent: boolean
  is_manual_override: boolean
  created_at: string
  updated_at: string
}

export interface PayrollRun {
  id: string
  employee_id: string
  pay_period_id: string
  gross_salary: number
  total_days_worked: number
  total_absences: number
  total_ot_hours: number
  total_ot_amount: number
  total_late_hours: number
  total_late_amount: number
  total_ut_hours: number
  total_ut_amount: number
  adjustment_hours: number
  adjustment_amount: number
  sub_hours: number
  sub_amount: number
  sss_ee: number
  philhealth_ee: number
  pagibig_ee: number
  loan_deductions: number
  absence_deduction: number
  total_deductions: number
  net_pay: number
  status: PayrollStatus
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
}

export interface Loan {
  id: string
  employee_id: string
  loan_type: LoanType
  description: string | null
  principal_amount: number
  monthly_deduction: number
  total_paid: number
  balance: number
  start_date: string | null
  status: LoanStatus
  created_at: string
}

export interface LoanPayment {
  id: string
  loan_id: string
  payroll_run_id: string
  amount: number
  payment_date: string
  pay_period_label: string | null
  created_at: string
}

export interface SSSBracket {
  id: number
  range_low: number
  range_high: number
  bracket: number
  ee_share: number
  er_share: number
  ec: number
}

export interface Holiday {
  id: string
  holiday_date: string
  name: string
  type: HolidayType
  year: number
}

// Supabase Database type (simplified for client usage)
export interface Database {
  public: {
    Tables: {
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>
      }
      pay_periods: {
        Row: PayPeriod
        Insert: Omit<PayPeriod, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<PayPeriod, 'id' | 'created_at'>>
      }
      time_entries: {
        Row: TimeEntry
        Insert: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>>
      }
      payroll_runs: {
        Row: PayrollRun
        Insert: Omit<PayrollRun, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<PayrollRun, 'id' | 'created_at'>>
      }
      loans: {
        Row: Loan
        Insert: Omit<Loan, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<Loan, 'id' | 'created_at'>>
      }
      loan_payments: {
        Row: LoanPayment
        Insert: Omit<LoanPayment, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<LoanPayment, 'id' | 'created_at'>>
      }
      sss_table: {
        Row: SSSBracket
        Insert: Omit<SSSBracket, 'id'> & { id?: number }
        Update: Partial<Omit<SSSBracket, 'id'>>
      }
      holidays: {
        Row: Holiday
        Insert: Omit<Holiday, 'id'> & { id?: string }
        Update: Partial<Omit<Holiday, 'id'>>
      }
    }
  }
}
