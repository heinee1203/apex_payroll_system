# Apex Payroll Calculator

A local-first payroll workspace for Apex Learning Academy.

## What it does

- Edit employees, rates, schedules, government deduction toggles, loan deductions, and adjustments.
- Enter or import employee time logs for a selected pay period.
- Automatically calculates regular hours, late time, undertime, approved overtime, absences, gross pay, deductions, and net pay.
- Exports the computed payroll table to CSV and supports browser printing.
- Saves workspace edits in browser local storage.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## CSV import format

With employee code:

```csv
ALA-001,2026-05-04,07:04,16:34,present,Faculty meeting
```

For the currently selected employee:

```csv
2026-05-04,07:04,16:34,present,Faculty meeting
```

Valid statuses are `present`, `absent`, `paid_leave`, `holiday`, and `rest_day`.
