-- ===========================================
-- SEED: SSS CONTRIBUTION TABLE (39 brackets)
-- ===========================================
INSERT INTO sss_table (range_low, range_high, bracket, ee_share, er_share, ec) VALUES
(0, 4249.99, 4000, 180.00, 380.00, 10.00),
(4250, 4749.99, 4500, 202.50, 427.50, 10.00),
(4750, 5249.99, 5000, 225.00, 475.00, 10.00),
(5250, 5749.99, 5500, 247.50, 522.50, 10.00),
(5750, 6249.99, 6000, 270.00, 570.00, 10.00),
(6250, 6749.99, 6500, 292.50, 617.50, 10.00),
(6750, 7249.99, 7000, 315.00, 665.00, 10.00),
(7250, 7749.99, 7500, 337.50, 712.50, 10.00),
(7750, 8249.99, 8000, 360.00, 760.00, 10.00),
(8250, 8749.99, 8500, 382.50, 807.50, 10.00),
(8750, 9249.99, 9000, 405.00, 855.00, 10.00),
(9250, 9749.99, 9500, 427.50, 902.50, 10.00),
(9750, 10249.99, 10000, 450.00, 950.00, 10.00),
(10250, 10749.99, 10500, 472.50, 997.50, 10.00),
(10750, 11249.99, 11000, 495.00, 1045.00, 10.00),
(11250, 11749.99, 11500, 517.50, 1092.50, 10.00),
(11750, 12249.99, 12000, 540.00, 1140.00, 10.00),
(12250, 12749.99, 12500, 562.50, 1187.50, 10.00),
(12750, 13249.99, 13000, 585.00, 1235.00, 10.00),
(13250, 13749.99, 13500, 607.50, 1282.50, 10.00),
(13750, 14249.99, 14000, 630.00, 1330.00, 10.00),
(14250, 14749.99, 14500, 652.50, 1377.50, 10.00),
(14750, 15249.99, 15000, 675.00, 1425.00, 30.00),
(15250, 15749.99, 15500, 697.50, 1472.50, 30.00),
(15750, 16249.99, 16000, 720.00, 1520.00, 30.00),
(16250, 16749.99, 16500, 742.50, 1567.50, 30.00),
(16750, 17249.99, 17000, 765.00, 1615.00, 30.00),
(17250, 17749.99, 17500, 787.50, 1662.50, 30.00),
(17750, 18249.99, 18000, 810.00, 1710.00, 30.00),
(18250, 18749.99, 18500, 832.50, 1757.50, 30.00),
(18750, 19249.99, 19000, 855.00, 1805.00, 30.00),
(19250, 19749.99, 19500, 877.50, 1852.50, 30.00),
(19750, 20249.99, 20000, 900.00, 1900.00, 30.00),
(20250, 20749.99, 20500, 922.50, 1947.50, 30.00),
(20750, 21249.99, 21000, 945.00, 1995.00, 30.00),
(21250, 21749.99, 21500, 967.50, 2042.50, 30.00),
(21750, 22249.99, 22000, 990.00, 2090.00, 30.00),
(22250, 22749.99, 22500, 1012.50, 2137.50, 30.00),
(22750, 23249.99, 23000, 1150.00, 2300.00, 30.00);

-- ===========================================
-- SEED: EMPLOYEES (11 from the Excel)
-- ===========================================
INSERT INTO employees (employee_code, last_name, first_name, basic_pay, pay_type, work_schedule, bank_name, bank_account_no, notes, saturday_pay) VALUES
('ALA-001', 'ADAN', 'RONALYN', 14500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', NULL, NULL, 'WITH TUTOR tag', TRUE),
('ALA-002', 'AVENGOZA', 'DANIELA LOURDES', 14500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', 'BPI', '4009-8002-65', 'WITH TUTOR tag', TRUE),
('ALA-003', 'BORBE', 'DESIREE', 14500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', NULL, NULL, NULL, TRUE),
('ALA-004', 'CANDIA', 'DENZEL', 15000, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', NULL, NULL, 'Has cash loan', TRUE),
('ALA-005', 'CARASCAL', 'MA. VERONICA', 18500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', NULL, NULL, 'Had cash advance (FINISHED)', TRUE),
('ALA-006', 'EBUENGA', 'ROSALYN', 14500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', 'BPI', '402-607-8766', NULL, TRUE),
('ALA-007', 'MATUS', 'LANDER', 350, 'daily', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', NULL, NULL, 'Daily-rate worker (aide/utility), no time-in/out tracking', TRUE),
('ALA-008', 'SOLTES', 'FRANCE ABBYGAIL', 14500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', 'BPI', '4026-0376-19', 'WITH TUTOR tag, had cash loan (FINISHED)', TRUE),
('ALA-009', 'VALENCIA', 'MARIA VILMA', 14500, 'monthly', '{"start": "07:30", "end": "16:30", "lunch_minutes": 60}', NULL, NULL, 'Different schedule, had grocery + advance loans', TRUE),
('ALA-010', 'CABRAL', 'MARIA NINA', 20000, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', 'BPI', '4026-0376-19', 'Higher salary', TRUE),
('ALA-011', 'PRESTADO', 'CHRISTINE', 14500, 'monthly', '{"start": "07:00", "end": "16:00", "lunch_minutes": 60}', NULL, NULL, 'SATURDAYS NO PAY, school-based schedule', FALSE);

-- ===========================================
-- SEED: ACTIVE LOANS
-- ===========================================
-- Candia's ₱30,000 cash loan (₱1,500/period, balance ₱15,000)
INSERT INTO loans (employee_id, loan_type, description, principal_amount, monthly_deduction, total_paid, balance, start_date, status)
SELECT id, 'cash_advance', 'Cash Loan', 30000, 1500, 15000, 15000, '2025-06-01', 'active'
FROM employees WHERE employee_code = 'ALA-004';

-- ===========================================
-- SEED: 2026 PHILIPPINE HOLIDAYS
-- ===========================================
INSERT INTO holidays (holiday_date, name, type, year) VALUES
('2026-01-01', 'New Year''s Day', 'regular', 2026),
('2026-01-29', 'Chinese New Year', 'special_non_working', 2026),
('2026-02-25', 'EDSA People Power Revolution Anniversary', 'special_non_working', 2026),
('2026-04-01', 'Maundy Thursday', 'regular', 2026),
('2026-04-02', 'Good Friday', 'regular', 2026),
('2026-04-03', 'Black Saturday', 'special_non_working', 2026),
('2026-04-09', 'Araw ng Kagitingan', 'regular', 2026),
('2026-05-01', 'Labor Day', 'regular', 2026),
('2026-06-12', 'Independence Day', 'regular', 2026),
('2026-08-21', 'Ninoy Aquino Day', 'special_non_working', 2026),
('2026-08-31', 'National Heroes Day', 'regular', 2026),
('2026-11-01', 'All Saints'' Day', 'special_non_working', 2026),
('2026-11-02', 'All Souls'' Day', 'special_non_working', 2026),
('2026-11-30', 'Bonifacio Day', 'regular', 2026),
('2026-12-08', 'Feast of the Immaculate Conception', 'special_non_working', 2026),
('2026-12-24', 'Christmas Eve', 'special_non_working', 2026),
('2026-12-25', 'Christmas Day', 'regular', 2026),
('2026-12-30', 'Rizal Day', 'regular', 2026),
('2026-12-31', 'Last Day of the Year', 'special_non_working', 2026);
