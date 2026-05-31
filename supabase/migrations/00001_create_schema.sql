-- Apex Payroll Database Schema
-- All tables for the payroll management system

-- ===========================================
-- EMPLOYEES
-- ===========================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  basic_pay DECIMAL(12,2) NOT NULL,
  pay_type TEXT NOT NULL DEFAULT 'monthly' CHECK (pay_type IN ('monthly', 'daily')),
  work_schedule JSONB NOT NULL DEFAULT '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}',
  bank_name TEXT,
  bank_account_no TEXT,
  sss_no TEXT,
  philhealth_no TEXT,
  pagibig_no TEXT,
  tin_no TEXT,
  date_hired DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  location TEXT,
  notes TEXT,
  saturday_pay BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- PAY PERIODS
-- ===========================================
CREATE TABLE pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_type TEXT NOT NULL CHECK (period_type IN ('1st_half', '2nd_half')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  working_days INT,
  saturday_count INT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'locked', 'paid')),
  sss_deduction BOOLEAN NOT NULL DEFAULT FALSE,
  philhealth_deduct BOOLEAN NOT NULL DEFAULT FALSE,
  pagibig_deduct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month, period_type)
);

-- ===========================================
-- TIME ENTRIES (DTR)
-- ===========================================
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  day_type TEXT NOT NULL DEFAULT 'regular' CHECK (day_type IN ('regular', 'sunday', 'saturday', 'holiday', 'special')),
  time_in TIME,
  time_out TIME,
  total_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
  ot_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
  ot_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ut_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
  late_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
  remarks TEXT,
  is_absent BOOLEAN NOT NULL DEFAULT FALSE,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, entry_date)
);

-- ===========================================
-- PAYROLL RUNS
-- ===========================================
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_days_worked INT NOT NULL DEFAULT 0,
  total_absences INT NOT NULL DEFAULT 0,
  total_ot_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_ot_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_late_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_late_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_ut_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_ut_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  adjustment_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  adjustment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sub_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  sub_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sss_ee DECIMAL(10,2) NOT NULL DEFAULT 0,
  philhealth_ee DECIMAL(10,2) NOT NULL DEFAULT 0,
  pagibig_ee DECIMAL(10,2) NOT NULL DEFAULT 0,
  loan_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  absence_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, pay_period_id)
);

-- ===========================================
-- LOANS
-- ===========================================
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('sss_loan', 'hdmf_loan', 'cash_advance', 'grocery_loan', 'cp_loan', 'other')),
  description TEXT,
  principal_amount DECIMAL(12,2) NOT NULL,
  monthly_deduction DECIMAL(12,2) NOT NULL,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- LOAN PAYMENTS
-- ===========================================
CREATE TABLE loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  pay_period_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- SSS TABLE
-- ===========================================
CREATE TABLE sss_table (
  id SERIAL PRIMARY KEY,
  range_low DECIMAL(12,2) NOT NULL,
  range_high DECIMAL(12,2) NOT NULL,
  bracket DECIMAL(12,2) NOT NULL,
  ee_share DECIMAL(10,2) NOT NULL,
  er_share DECIMAL(10,2) NOT NULL,
  ec DECIMAL(10,2) NOT NULL
);

-- ===========================================
-- HOLIDAYS
-- ===========================================
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'regular' CHECK (type IN ('regular', 'special_non_working', 'special_working')),
  year INT NOT NULL
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_pay_period ON time_entries(pay_period_id);
CREATE INDEX idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX idx_payroll_runs_employee ON payroll_runs(employee_id);
CREATE INDEX idx_payroll_runs_pay_period ON payroll_runs(pay_period_id);
CREATE INDEX idx_loans_employee ON loans(employee_id);
CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX idx_holidays_date ON holidays(holiday_date);
CREATE INDEX idx_holidays_year ON holidays(year);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sss_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Simple authenticated-user-only policies
CREATE POLICY "Authenticated access" ON employees FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON pay_periods FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON time_entries FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON payroll_runs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON loans FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON loan_payments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON sss_table FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON holidays FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_employees
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_time_entries
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
