import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Plus,
  Printer,
  RefreshCcw,
  Settings,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_SSS_BRACKETS, createDefaultWorkspace } from '../../data/defaultWorkspace'
import { computeOvertimeHours } from '../../engine/overtime'
import {
  computeDailyLog,
  computeEmployeePayroll,
  computeWorkspaceTotals,
  generateDateRange,
  getDayName,
  HOLIDAYS_2026,
  mergeMissingTimeLogs,
  normalizeStatus,
  STATUS_LABELS,
  type EmployeeRecord,
  type PayrollSettings,
  type PayrollSummary,
  type TimeLogEntry,
  type TimeLogStatus,
  type WorkspaceState,
  type WorkspaceView,
} from '../../engine/timeLogPayroll'
import { formatCurrency, formatDate, formatDateShort, formatHours, formatTimeDisplay } from '../../utils/format'

const STORAGE_KEY = 'apex-payroll-workspace-v2'

const navItems: Array<{ id: WorkspaceView; label: string; icon: typeof Clock }> = [
  { id: 'logs', label: 'Time Logs', icon: Clock },
  { id: 'payroll', label: 'Payroll', icon: Calculator },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function PayrollWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspace())
  const [view, setView] = useState<WorkspaceView>('logs')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => {
    const initial = loadWorkspace()
    return initial.employees.find((employee) => employee.active)?.id || ''
  })
  const [importText, setImportText] = useState('')
  const [dtrPhotoUrl, setDtrPhotoUrl] = useState('')
  const [dtrPhotoName, setDtrPhotoName] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [rawOcrText, setRawOcrText] = useState('')
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrBusy, setOcrBusy] = useState(false)

  useEffect(() => {
    saveWorkspace(workspace)
  }, [workspace])

  useEffect(() => {
    return () => {
      if (dtrPhotoUrl) URL.revokeObjectURL(dtrPhotoUrl)
    }
  }, [dtrPhotoUrl])

  const activeEmployees = useMemo(
    () => workspace.employees.filter((employee) => employee.active),
    [workspace.employees]
  )

  const periodDates = useMemo(
    () => generateDateRange(workspace.settings.periodStart, workspace.settings.periodEnd),
    [workspace.settings.periodStart, workspace.settings.periodEnd]
  )

  const logsInPeriod = useMemo(
    () => workspace.logs.filter((log) => log.date >= workspace.settings.periodStart && log.date <= workspace.settings.periodEnd),
    [workspace.logs, workspace.settings.periodEnd, workspace.settings.periodStart]
  )

  const summaries = useMemo(
    () => activeEmployees.map((employee) => {
      const employeeLogs = logsInPeriod.filter((log) => log.employeeId === employee.id)
      return computeEmployeePayroll(employee, employeeLogs, workspace.settings, DEFAULT_SSS_BRACKETS)
    }),
    [activeEmployees, logsInPeriod, workspace.settings]
  )

  const totals = useMemo(() => computeWorkspaceTotals(summaries), [summaries])
  const effectiveSelectedEmployeeId = activeEmployees.some((employee) => employee.id === selectedEmployeeId)
    ? selectedEmployeeId
    : activeEmployees[0]?.id || ''
  const selectedEmployee = activeEmployees.find((employee) => employee.id === effectiveSelectedEmployeeId) || activeEmployees[0]
  const selectedLogs = useMemo(
    () => logsInPeriod
      .filter((log) => log.employeeId === selectedEmployee?.id)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [logsInPeriod, selectedEmployee?.id]
  )
  const selectedSummary = summaries.find((summary) => summary.employee.id === selectedEmployee?.id)

  const updateSettings = (patch: Partial<WorkspaceState['settings']>) => {
    setWorkspace((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
      logs: mergeMissingTimeLogs(
        current.logs,
        current.employees,
        { ...current.settings, ...patch }
      ),
    }))
  }

  const updateEmployee = (employeeId: string, patch: Partial<EmployeeRecord>) => {
    setWorkspace((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === employeeId ? { ...employee, ...patch } : employee
      ),
    }))
  }

  const addEmployee = () => {
    const nextNumber = workspace.employees.length + 1
    const employee: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      code: `ALA-${String(nextNumber).padStart(3, '0')}`,
      name: 'NEW EMPLOYEE',
      role: 'Staff',
      payType: 'monthly',
      basicPay: 14500,
      schedule: { start: '07:00', end: '16:00', lunch_minutes: 60 },
      saturdayPaid: true,
      sssEnabled: true,
      philHealthEnabled: true,
      pagIbigEnabled: true,
      loanDeduction: 0,
      adjustment: 0,
      active: true,
    }

    setWorkspace((current) => ({
      ...current,
      employees: [...current.employees, employee],
      logs: mergeMissingTimeLogs(current.logs, [...current.employees, employee], current.settings),
    }))
    setSelectedEmployeeId(employee.id)
    setView('employees')
    toast.success('Employee added')
  }

  const removeEmployee = (employeeId: string) => {
    setWorkspace((current) => ({
      ...current,
      employees: current.employees.filter((employee) => employee.id !== employeeId),
      logs: current.logs.filter((log) => log.employeeId !== employeeId),
    }))
    toast.success('Employee removed')
  }

  const updateLog = (logId: string, patch: Partial<TimeLogEntry>) => {
    setWorkspace((current) => ({
      ...current,
      logs: current.logs.map((log) => {
        if (log.id !== logId) return log
        const nextLog = { ...log, ...patch }
        if (patch.status && patch.status !== 'present') {
          nextLog.timeIn = ''
          nextLog.timeOut = ''
          nextLog.otApproved = false
        }
        return nextLog
      }),
    }))
  }

  const fillSelectedEmployeeSchedule = () => {
    if (!selectedEmployee) return

    setWorkspace((current) => ({
      ...current,
      logs: current.logs.map((log) => {
        if (log.employeeId !== selectedEmployee.id || log.date < current.settings.periodStart || log.date > current.settings.periodEnd) {
          return log
        }
        if (log.status !== 'present') return log

        return {
          ...log,
          timeIn: selectedEmployee.schedule.start,
          timeOut: selectedEmployee.schedule.end,
        }
      }),
    }))
    toast.success('Schedule applied')
  }

  const clearSelectedEmployeeTimes = () => {
    if (!selectedEmployee) return

    setWorkspace((current) => ({
      ...current,
      logs: current.logs.map((log) => {
        if (log.employeeId !== selectedEmployee.id || log.date < current.settings.periodStart || log.date > current.settings.periodEnd) {
          return log
        }
        return log.status === 'present'
          ? { ...log, timeIn: '', timeOut: '', otApproved: false }
          : log
      }),
    }))
    toast.success('Time fields cleared')
  }

  const markBlankLogsAbsent = () => {
    if (!selectedEmployee) return

    setWorkspace((current) => ({
      ...current,
      logs: current.logs.map((log) => {
        const blankPresent = log.employeeId === selectedEmployee.id &&
          log.date >= current.settings.periodStart &&
          log.date <= current.settings.periodEnd &&
          log.status === 'present' &&
          !log.timeIn &&
          !log.timeOut

        return blankPresent ? { ...log, status: 'absent', otApproved: false } : log
      }),
    }))
    toast.success('Blank days marked absent')
  }

  const applyImportedRows = (text: string, fallbackEmployeeId: string) => {
    const result = importTextIntoWorkspace(workspace, text, fallbackEmployeeId)
    if (result.hasRows) setWorkspace(result.workspace)
    return result
  }

  const importTimeLogs = () => {
    const result = applyImportedRows(importText, effectiveSelectedEmployeeId)

    if (!result.hasRows) {
      toast.error('Nothing to import')
      return
    }

    if (result.imported > 0) {
      setImportText('')
      toast.success(`Imported ${result.imported} time log${result.imported === 1 ? '' : 's'}`)
    }
    if (result.skipped > 0) toast.warning(`${result.skipped} row${result.skipped === 1 ? '' : 's'} skipped`)
  }

  const handleDtrPhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setDtrPhotoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return nextUrl
    })
    setDtrPhotoName(file.name)
    setOcrText('')
    setRawOcrText('')
    setOcrProgress(0)
    setOcrStatus('Loading OCR')
    setOcrBusy(true)

    try {
      const { recognize } = await import('tesseract.js')
      const result = await recognize(file, 'eng', {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract',
        langPath: '/tessdata',
        logger: (message) => {
          setOcrStatus(titleCase(message.status || 'Reading image'))
          setOcrProgress(Math.round((message.progress || 0) * 100))
        },
      })
      const rawText = result.data.text.trim()
      const extractedRows = convertOcrDtrTextToImportRows(
        rawText,
        workspace.settings.periodStart,
        workspace.settings.periodEnd
      )

      setRawOcrText(rawText)
      setOcrText(extractedRows || rawText)
      toast.success(extractedRows ? 'DTR photo converted to import rows' : 'OCR text extracted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to read DTR photo')
    } finally {
      setOcrBusy(false)
    }
  }

  const applyPhotoLogs = () => {
    const result = applyImportedRows(ocrText, effectiveSelectedEmployeeId)

    if (!result.hasRows) {
      toast.error('Nothing to apply')
      return
    }

    if (result.imported > 0) {
      toast.success(`Applied ${result.imported} photo log${result.imported === 1 ? '' : 's'}`)
    }
    if (result.skipped > 0) toast.warning(`${result.skipped} row${result.skipped === 1 ? '' : 's'} skipped`)
  }

  const clearPhotoImport = () => {
    setDtrPhotoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return ''
    })
    setDtrPhotoName('')
    setOcrText('')
    setRawOcrText('')
    setOcrProgress(0)
    setOcrStatus('')
    setOcrBusy(false)
  }

  const exportPayrollCsv = () => {
    const rows = [
      [
        'Code',
        'Employee',
        'Paid Days',
        'Absences',
        'Incomplete Days',
        'Regular Hours',
        'OT Hours',
        'Gross Pay',
        'OT Pay',
        'Late Deduction',
        'Undertime Deduction',
        'Absence Deduction',
        'SSS',
        'PhilHealth',
        'Pag-IBIG',
        'Loans',
        'Adjustment',
        'Total Deductions',
        'Net Pay',
      ],
      ...summaries.map((summary) => [
        summary.employee.code,
        summary.employee.name,
        summary.paidDays,
        summary.absences,
        summary.incompleteDays,
        summary.regularHours,
        summary.overtimeHours,
        summary.grossPay,
        summary.overtimePay,
        summary.lateDeduction,
        summary.undertimeDeduction,
        summary.absenceDeduction,
        summary.sss,
        summary.philHealth,
        summary.pagIbig,
        summary.loanDeduction,
        summary.adjustment,
        summary.totalDeductions,
        summary.netPay,
      ]),
    ]

    downloadCsv(
      `apex-payroll-${workspace.settings.periodStart}-to-${workspace.settings.periodEnd}.csv`,
      rows
    )
    toast.success('Payroll CSV exported')
  }

  const resetWorkspace = () => {
    const fresh = createDefaultWorkspace()
    setWorkspace(fresh)
    setSelectedEmployeeId(fresh.employees.find((employee) => employee.active)?.id || '')
    toast.success('Workspace reset')
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="no-print w-full border-b border-slate-800 bg-slate-950 text-white lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-4 py-4 lg:block">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Apex</p>
              <h1 className="text-lg font-bold">Payroll Calculator</h1>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:pb-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors lg:w-full ${
                  view === id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <div className="hidden border-t border-slate-800 px-4 py-3 text-xs text-slate-500 lg:block">
            Local workspace
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold">{workspace.settings.companyName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <CalendarDays size={15} />
                  <span>{formatDate(workspace.settings.periodStart)} to {formatDate(workspace.settings.periodEnd)}</span>
                  {totals.incompleteDays > 0 ? (
                    <span className="badge-warning">{totals.incompleteDays} incomplete logs</span>
                  ) : (
                    <span className="badge-success">Ready</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={exportPayrollCsv}>
                  <Download size={16} />
                  Export CSV
                </button>
                <button className="btn-secondary" onClick={() => window.print()}>
                  <Printer size={16} />
                  Print
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-4 p-4">
            <StatsStrip totals={totals} />

            {view === 'logs' && selectedEmployee && selectedSummary && (
              <TimeLogsView
                employee={selectedEmployee}
                employees={activeEmployees}
                logs={selectedLogs}
                summary={selectedSummary}
                selectedEmployeeId={selectedEmployee.id}
                onSelectEmployee={setSelectedEmployeeId}
                onUpdateLog={updateLog}
                onFillSchedule={fillSelectedEmployeeSchedule}
                onClearTimes={clearSelectedEmployeeTimes}
                onMarkBlankAbsent={markBlankLogsAbsent}
                dtrPhotoUrl={dtrPhotoUrl}
                dtrPhotoName={dtrPhotoName}
                ocrText={ocrText}
                rawOcrText={rawOcrText}
                ocrBusy={ocrBusy}
                ocrProgress={ocrProgress}
                ocrStatus={ocrStatus}
                onPhotoSelected={handleDtrPhotoSelected}
                onOcrTextChange={setOcrText}
                onApplyPhotoLogs={applyPhotoLogs}
                onClearPhotoImport={clearPhotoImport}
              />
            )}

            {view === 'payroll' && (
              <PayrollView summaries={summaries} totals={totals} />
            )}

            {view === 'employees' && (
              <EmployeesView
                employees={workspace.employees}
                logs={workspace.logs}
                settings={workspace.settings}
                onAdd={addEmployee}
                onRemove={removeEmployee}
                onUpdate={updateEmployee}
              />
            )}

            {view === 'settings' && (
              <SettingsView
                settings={workspace.settings}
                periodDates={periodDates}
                importText={importText}
                onImportTextChange={setImportText}
                onImport={importTimeLogs}
                onReset={resetWorkspace}
                onUpdateSettings={updateSettings}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function StatsStrip({ totals }: { totals: ReturnType<typeof computeWorkspaceTotals> }) {
  const stats = [
    { label: 'Net Pay', value: formatCurrency(totals.netPay), tone: 'text-cyan-700', icon: Wallet },
    { label: 'Gross Pay', value: formatCurrency(totals.grossPay), tone: 'text-slate-900', icon: Calculator },
    { label: 'Deductions', value: formatCurrency(totals.deductions), tone: 'text-rose-700', icon: AlertTriangle },
    { label: 'OT Hours', value: formatHours(totals.overtimeHours), tone: 'text-emerald-700', icon: Clock },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, tone, icon: Icon }) => (
        <div key={label} className="card card-body">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Icon size={18} />
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

function TimeLogsView({
  employee,
  employees,
  logs,
  summary,
  selectedEmployeeId,
  onSelectEmployee,
  onUpdateLog,
  onFillSchedule,
  onClearTimes,
  onMarkBlankAbsent,
  dtrPhotoUrl,
  dtrPhotoName,
  ocrText,
  rawOcrText,
  ocrBusy,
  ocrProgress,
  ocrStatus,
  onPhotoSelected,
  onOcrTextChange,
  onApplyPhotoLogs,
  onClearPhotoImport,
}: {
  employee: EmployeeRecord
  employees: EmployeeRecord[]
  logs: TimeLogEntry[]
  summary: ReturnType<typeof computeEmployeePayroll>
  selectedEmployeeId: string
  onSelectEmployee: (employeeId: string) => void
  onUpdateLog: (logId: string, patch: Partial<TimeLogEntry>) => void
  onFillSchedule: () => void
  onClearTimes: () => void
  onMarkBlankAbsent: () => void
  dtrPhotoUrl: string
  dtrPhotoName: string
  ocrText: string
  rawOcrText: string
  ocrBusy: boolean
  ocrProgress: number
  ocrStatus: string
  onPhotoSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onOcrTextChange: (value: string) => void
  onApplyPhotoLogs: () => void
  onClearPhotoImport: () => void
}) {
  return (
    <section className="space-y-4">
      <DtrPhotoImportPanel
        employee={employee}
        dtrPhotoUrl={dtrPhotoUrl}
        dtrPhotoName={dtrPhotoName}
        ocrText={ocrText}
        rawOcrText={rawOcrText}
        ocrBusy={ocrBusy}
        ocrProgress={ocrProgress}
        ocrStatus={ocrStatus}
        onPhotoSelected={onPhotoSelected}
        onOcrTextChange={onOcrTextChange}
        onApplyPhotoLogs={onApplyPhotoLogs}
        onClearPhotoImport={onClearPhotoImport}
      />

      <div className="no-print flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedEmployeeId}
            onChange={(event) => onSelectEmployee(event.target.value)}
            className="select min-w-64"
          >
            {employees.map((option) => (
              <option key={option.id} value={option.id}>{option.code} - {option.name}</option>
            ))}
          </select>
          <span className="text-sm text-slate-500">
            {formatTimeDisplay(employee.schedule.start)} to {formatTimeDisplay(employee.schedule.end)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={onFillSchedule}>
            <CheckCircle2 size={16} />
            Fill Schedule
          </button>
          <button className="btn-secondary" onClick={onMarkBlankAbsent}>
            <AlertTriangle size={16} />
            Mark Blank Absent
          </button>
          <button className="btn-secondary" onClick={onClearTimes}>
            <RefreshCcw size={16} />
            Clear Times
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <Metric label="Paid Days" value={String(summary.paidDays)} />
        <Metric label="Absences" value={String(summary.absences)} danger={summary.absences > 0} />
        <Metric label="Late / UT" value={`${formatHours(summary.lateHours)} / ${formatHours(summary.undertimeHours)}`} danger={summary.lateHours + summary.undertimeHours > 0} />
        <Metric label="Net Pay" value={formatCurrency(summary.netPay)} strong />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">In</th>
                <th className="px-3 py-2">Out</th>
                <th className="px-3 py-2 text-right">Hours</th>
                <th className="px-3 py-2 text-right">Late</th>
                <th className="px-3 py-2 text-right">UT</th>
                <th className="px-3 py-2 text-right">OT</th>
                <th className="px-3 py-2 text-center">Approve</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const day = computeDailyLog(employee, log)
                const otCandidate = log.status === 'present' && log.timeOut
                  ? computeOvertimeHours(log.timeOut, employee.schedule.end)
                  : 0

                return (
                  <tr key={log.id} className={`border-b border-slate-100 ${rowTone(log.status, day.incomplete)}`}>
                    <td className="px-3 py-2 font-medium">{formatDateShort(log.date)}</td>
                    <td className="px-3 py-2 text-sm text-slate-500">{getDayName(log.date)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={log.status}
                        onChange={(event) => onUpdateLog(log.id, { status: event.target.value as TimeLogStatus })}
                        className="select min-w-44 py-1"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={log.timeIn}
                        disabled={log.status !== 'present'}
                        onChange={(event) => onUpdateLog(log.id, { timeIn: event.target.value })}
                        onInput={(event) => onUpdateLog(log.id, { timeIn: event.currentTarget.value })}
                        className="input min-w-28 py-1 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={log.timeOut}
                        disabled={log.status !== 'present'}
                        onChange={(event) => onUpdateLog(log.id, { timeOut: event.target.value })}
                        onInput={(event) => onUpdateLog(log.id, { timeOut: event.currentTarget.value })}
                        className="input min-w-28 py-1 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatHours(day.regularHours)}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-700">{day.lateHours ? formatHours(day.lateHours) : '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-700">{day.undertimeHours ? formatHours(day.undertimeHours) : '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-700">{otCandidate ? formatHours(otCandidate) : '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={log.otApproved}
                        disabled={otCandidate <= 0}
                        onChange={(event) => onUpdateLog(log.id, { otApproved: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={log.notes}
                        onChange={(event) => onUpdateLog(log.id, { notes: event.target.value })}
                        className="input min-w-48 py-1"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function DtrPhotoImportPanel({
  employee,
  dtrPhotoUrl,
  dtrPhotoName,
  ocrText,
  rawOcrText,
  ocrBusy,
  ocrProgress,
  ocrStatus,
  onPhotoSelected,
  onOcrTextChange,
  onApplyPhotoLogs,
  onClearPhotoImport,
}: {
  employee: EmployeeRecord
  dtrPhotoUrl: string
  dtrPhotoName: string
  ocrText: string
  rawOcrText: string
  ocrBusy: boolean
  ocrProgress: number
  ocrStatus: string
  onPhotoSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onOcrTextChange: (value: string) => void
  onApplyPhotoLogs: () => void
  onClearPhotoImport: () => void
}) {
  return (
    <div className="no-print rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-base font-semibold">DTR Photo</h2>
          <p className="mt-1 text-sm text-slate-500">{employee.code} - {employee.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            id="dtr-photo-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoSelected}
            className="hidden"
          />
          <label htmlFor="dtr-photo-upload" className="btn-secondary">
            <Upload size={16} />
            Choose Photo
          </label>
          {(dtrPhotoUrl || ocrText) && (
            <button className="btn-secondary" onClick={onClearPhotoImport}>
              <RefreshCcw size={16} />
              Clear
            </button>
          )}
          {ocrText && (
            <button className="btn-primary" onClick={onApplyPhotoLogs}>
              <CheckCircle2 size={16} />
              Apply Logs
            </button>
          )}
        </div>
      </div>

      {(dtrPhotoUrl || ocrBusy || ocrText) && (
        <div className="mt-3 grid gap-3 xl:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {dtrPhotoUrl ? (
              <img
                src={dtrPhotoUrl}
                alt="DTR preview"
                className="max-h-64 w-full rounded-md border border-slate-200 object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
                No photo
              </div>
            )}
            {dtrPhotoName && <p className="truncate text-xs text-slate-500">{dtrPhotoName}</p>}
          </div>

          <div className="space-y-2">
            {ocrBusy && (
              <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-cyan-900">
                  <span>{ocrStatus || 'Reading image'}</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-cyan-100">
                  <div className="h-full bg-cyan-600 transition-all" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}

            <div>
              <label className="label">Extracted Rows</label>
              <textarea
                value={ocrText}
                onChange={(event) => onOcrTextChange(event.target.value)}
                className="input min-h-36 font-mono text-xs"
                placeholder="2026-05-04,07:04,16:34,present"
              />
            </div>

            {rawOcrText && (
              <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <summary className="cursor-pointer font-medium text-slate-700">Raw OCR</summary>
                <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-xs text-slate-600">{rawOcrText}</pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PayrollView({
  summaries,
  totals,
}: {
  summaries: ReturnType<typeof computeEmployeePayroll>[]
  totals: ReturnType<typeof computeWorkspaceTotals>
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Employees" value={String(totals.employees)} />
          <Metric label="Gross + OT" value={formatCurrency(totals.grossPay + totals.overtimePay)} />
          <Metric label="Deductions" value={formatCurrency(totals.deductions)} danger={totals.deductions > 0} />
          <Metric label="Payroll Total" value={formatCurrency(totals.netPay)} strong />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-[11px] leading-tight">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[4%]" />
              <col className="w-[4%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-1.5 py-1.5 text-[10px] tracking-normal">Employee</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Days</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Abs</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Gross</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">OT</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Late</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">UT</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Absent</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Gov</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Loans</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Adj</th>
                <th className="px-1.5 py-1.5 text-right text-[10px] tracking-normal">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const government = summary.sss + summary.philHealth + summary.pagIbig

                return (
                  <tr key={summary.employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-1.5 py-1.5">
                      <div className="truncate text-[12px] font-semibold" title={summary.employee.name}>{summary.employee.name}</div>
                      <div className="truncate text-[10px] text-slate-500">{summary.employee.code} | {summary.employee.role}</div>
                    </td>
                    <td className="px-1.5 py-1.5 text-right">{summary.paidDays}</td>
                    <td className="px-1.5 py-1.5 text-right text-rose-700">{summary.absences || '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{formatCurrency(summary.grossPay)}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-emerald-700">{summary.overtimePay ? formatCurrency(summary.overtimePay) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-rose-700">{summary.lateDeduction ? formatCurrency(summary.lateDeduction) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-rose-700">{summary.undertimeDeduction ? formatCurrency(summary.undertimeDeduction) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-rose-700">{summary.absenceDeduction ? formatCurrency(summary.absenceDeduction) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{government ? formatCurrency(government) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{summary.loanDeduction ? formatCurrency(summary.loanDeduction) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{summary.adjustment ? formatCurrency(summary.adjustment) : '-'}</td>
                    <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono text-[12px] font-bold">{formatCurrency(summary.netPay)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function EmployeesView({
  employees,
  logs,
  settings,
  onAdd,
  onRemove,
  onUpdate,
}: {
  employees: EmployeeRecord[]
  logs: TimeLogEntry[]
  settings: PayrollSettings
  onAdd: () => void
  onRemove: (employeeId: string) => void
  onUpdate: (employeeId: string, patch: Partial<EmployeeRecord>) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [selectedEmployeePageId, setSelectedEmployeePageId] = useState('')
  const activeCount = employees.filter((employee) => employee.active).length
  const inactiveCount = employees.length - activeCount
  const visibleEmployees = employees.filter((employee) =>
    statusFilter === 'active' ? employee.active : !employee.active
  )
  const selectedEmployeePage = employees.find((employee) => employee.id === selectedEmployeePageId)

  if (selectedEmployeePage) {
    return (
      <EmployeeDetailPage
        employee={selectedEmployeePage}
        logs={logs}
        settings={settings}
        onBack={() => setSelectedEmployeePageId('')}
        onUpdate={(patch) => onUpdate(selectedEmployeePage.id, patch)}
      />
    )
  }

  return (
    <section className="space-y-4">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold">Employees</h2>
          <div className="inline-flex w-fit rounded-md border border-slate-300 bg-white p-1 shadow-sm">
            {[
              { id: 'active' as const, label: 'Active', count: activeCount },
              { id: 'inactive' as const, label: 'Inactive', count: inactiveCount },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={statusFilter === option.id}
                onClick={() => setStatusFilter(option.id)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === option.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {option.label}
                <span className={`ml-2 font-mono text-xs ${statusFilter === option.id ? 'text-cyan-50' : 'text-slate-400'}`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={onAdd}>
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1360px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Basic Pay</th>
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2 text-center">Sat Work</th>
                <th className="px-3 py-2 text-center">SSS</th>
                <th className="px-3 py-2 text-center">PhilH</th>
                <th className="px-3 py-2 text-center">HDMF</th>
                <th className="px-3 py-2 text-right">Loan</th>
                <th className="px-3 py-2 text-right">Adj</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-sm text-slate-500">
                    No {statusFilter} employees
                  </td>
                </tr>
              ) : visibleEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className={`border-b border-slate-100 ${employee.active ? '' : 'bg-slate-50 text-slate-500'}`}
                >
                  <td className="px-3 py-2">
                    <input
                      value={employee.code}
                      onChange={(event) => onUpdate(employee.id, { code: event.target.value })}
                      className="input w-28 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={employee.name}
                      onChange={(event) => onUpdate(employee.id, { name: event.target.value })}
                      className="input min-w-56 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={employee.role}
                      onChange={(event) => onUpdate(employee.id, { role: event.target.value })}
                      className="input min-w-32 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={employee.active} onChange={(checked) => onUpdate(employee.id, { active: checked })} />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={employee.payType}
                      onChange={(event) => onUpdate(employee.id, { payType: event.target.value as EmployeeRecord['payType'] })}
                      className="select w-28 py-1"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={employee.basicPay}
                      onChange={(event) => onUpdate(employee.id, { basicPay: numberFromInput(event.target.value) })}
                      className="input w-32 py-1 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={employee.schedule.start}
                        onChange={(event) => onUpdate(employee.id, { schedule: { ...employee.schedule, start: event.target.value } })}
                        className="input w-28 py-1"
                      />
                      <input
                        type="time"
                        value={employee.schedule.end}
                        onChange={(event) => onUpdate(employee.id, { schedule: { ...employee.schedule, end: event.target.value } })}
                        className="input w-28 py-1"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={employee.saturdayPaid} onChange={(checked) => onUpdate(employee.id, { saturdayPaid: checked })} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={employee.sssEnabled} onChange={(checked) => onUpdate(employee.id, { sssEnabled: checked })} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={employee.philHealthEnabled} onChange={(checked) => onUpdate(employee.id, { philHealthEnabled: checked })} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={employee.pagIbigEnabled} onChange={(checked) => onUpdate(employee.id, { pagIbigEnabled: checked })} />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={employee.loanDeduction}
                      onChange={(event) => onUpdate(employee.id, { loanDeduction: numberFromInput(event.target.value) })}
                      className="input w-28 py-1 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={employee.adjustment}
                      onChange={(event) => onUpdate(employee.id, { adjustment: numberFromInput(event.target.value) })}
                      className="input w-28 py-1 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost p-1 text-cyan-700" onClick={() => setSelectedEmployeePageId(employee.id)} title="Open employee page">
                        <Eye size={16} />
                      </button>
                      <button className="btn-ghost p-1 text-rose-700" onClick={() => onRemove(employee.id)} title="Remove employee">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

type PayrollHistoryEntry = {
  periodKey: string
  periodStart: string
  periodEnd: string
  logs: TimeLogEntry[]
  summary: PayrollSummary
}

function EmployeeDetailPage({
  employee,
  logs,
  settings,
  onBack,
  onUpdate,
}: {
  employee: EmployeeRecord
  logs: TimeLogEntry[]
  settings: PayrollSettings
  onBack: () => void
  onUpdate: (patch: Partial<EmployeeRecord>) => void
}) {
  const history = useMemo(
    () => buildEmployeePayrollHistory(employee, logs, settings),
    [employee, logs, settings]
  )
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('')
  const selectedHistory = history.find((entry) => entry.periodKey === selectedPeriodKey) || history[0]

  return (
    <section className="space-y-4">
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button className="btn-secondary w-fit" onClick={onBack}>
            <ArrowLeft size={16} />
            Employees
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{employee.name}</h2>
              <span className={employee.active ? 'badge-success' : 'badge-neutral'}>
                {employee.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{employee.code} | {employee.role} | {employee.payType}</p>
          </div>
        </div>
        <label className="flex w-fit items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          Active employee
          <Toggle checked={employee.active} onChange={(checked) => onUpdate({ active: checked })} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Basic Pay" value={formatCurrency(employee.basicPay)} />
        <Metric label="Periods" value={String(history.length)} />
        <Metric label="Latest Net Pay" value={selectedHistory ? formatCurrency(selectedHistory.summary.netPay) : formatCurrency(0)} strong />
        <Metric label="Latest Deductions" value={selectedHistory ? formatCurrency(selectedHistory.summary.totalDeductions) : formatCurrency(0)} danger />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[420px_1fr]">
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-slate-500" />
              <h3 className="text-base font-semibold">Payroll History</h3>
            </div>
            <span className="badge-neutral">{history.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">Deduct</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                      No payroll history yet
                    </td>
                  </tr>
                ) : history.map((entry) => (
                  <tr
                    key={entry.periodKey}
                    className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${
                      selectedHistory?.periodKey === entry.periodKey ? 'bg-cyan-50' : ''
                    }`}
                    onClick={() => setSelectedPeriodKey(entry.periodKey)}
                  >
                    <td className="px-3 py-2 font-medium">{formatDateShort(entry.periodStart)} - {formatDateShort(entry.periodEnd)}</td>
                    <td className="px-3 py-2">{getPayslipType(entry.periodEnd)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(entry.summary.grossPay + entry.summary.overtimePay)}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-700">{formatCurrency(entry.summary.totalDeductions)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(entry.summary.netPay)}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setSelectedPeriodKey(entry.periodKey)}>
                        <FileText size={14} />
                        Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedHistory && (
          <div className="space-y-3">
            <div className="no-print flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Payslip</h3>
                <p className="text-sm text-slate-500">{formatPayslipPeriod(selectedHistory.periodStart, selectedHistory.periodEnd)}</p>
              </div>
              <button className="btn-secondary" onClick={printPayslip}>
                <Printer size={16} />
                Print Payslip
              </button>
            </div>
            <EmployeePayslip entry={selectedHistory} />
          </div>
        )}
      </div>
    </section>
  )
}

function EmployeePayslip({ entry }: { entry: PayrollHistoryEntry }) {
  const { summary } = entry
  const contributions = summary.sss + summary.philHealth + summary.pagIbig
  const netSalary = summary.grossPay + summary.overtimePay - contributions
  const otherDeductions = summary.lateDeduction + summary.undertimeDeduction + summary.absenceDeduction + summary.loanDeduction
  const netPay = netSalary - otherDeductions + summary.adjustment

  return (
    <div className="overflow-x-auto rounded-md bg-white p-4 shadow-sm payslip-print-area">
      <div className="mx-auto min-w-[820px] max-w-[960px] bg-white text-black">
        <div className="border-2 border-black font-sans text-[13px] leading-tight">
          <div className="border-b-2 border-black py-3 text-center text-2xl font-bold">PAYSLIP</div>
          <div className="grid grid-cols-[90px_1.1fr_90px_1.1fr_70px_120px] px-1 py-1">
            <div className="font-bold">DATE:</div>
            <div className="font-bold text-blue-700">{formatPayslipDate(entry.periodEnd)}</div>
            <div className="font-bold">PERIOD :</div>
            <div className="font-bold text-blue-700">{formatPayslipPeriod(entry.periodStart, entry.periodEnd)}</div>
            <div className="font-bold">TYPE:</div>
            <div className="font-bold text-blue-700">{getPayslipType(entry.periodEnd)}</div>
            <div className="font-bold">NAME:</div>
            <div className="col-span-5 font-bold text-blue-700">{summary.employee.name}</div>
          </div>

          <div className="grid grid-cols-2 border-y-2 border-black">
            <div className="border-r-2 border-black">
              <div className="grid grid-cols-[1fr_140px] border-b-2 border-black font-bold">
                <div className="px-1 py-1">EARNINGS</div>
                <div className="px-1 py-1">AMOUNT:</div>
              </div>
              <div className="grid min-h-[250px] grid-cols-[1fr_140px] content-start gap-y-2 px-1 py-1">
                <div>BASIC SALARY</div>
                <div className="text-right">{formatPayslipMoney(summary.grossPay, false)}</div>
                {summary.overtimePay > 0 && (
                  <>
                    <div>OVERTIME PAY</div>
                    <div className="text-right">{formatPayslipMoney(summary.overtimePay)}</div>
                  </>
                )}
                <div className="col-span-2">LESS: Contributions and Wtax</div>
                <div className="pl-12">SSS</div>
                <div className="text-right">{formatPayslipMoney(summary.sss)}</div>
                <div className="pl-12">PHILHEALTH</div>
                <div className="text-right">{formatPayslipMoney(summary.philHealth)}</div>
                <div className="pl-12">PAG IBIG</div>
                <div className="text-right">{formatPayslipMoney(summary.pagIbig)}</div>
                <div className="mt-12">Total Contributions</div>
                <div className="mt-12 text-right">{formatPayslipMoney(contributions)}</div>
                <div>NET SALARY</div>
                <div className="text-right">{formatPayslipMoney(netSalary, false)}</div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-[1fr_190px] border-b-2 border-black font-bold">
                <div className="border-r-2 border-black px-1 py-1">Loans &amp; Other Deductions:</div>
                <div className="px-1 py-1">AMOUNT:</div>
              </div>
              <div className="grid min-h-[290px] grid-cols-[1fr_190px] content-start gap-y-2 px-1 py-1">
                <div>ABSENCES</div>
                <div className="text-right">{formatPayslipMoney(summary.absenceDeduction)}</div>
                {summary.lateDeduction > 0 && (
                  <>
                    <div>LATE ( {formatPayslipHours(summary.lateHours)} HRS )</div>
                    <div className="text-right">{formatPayslipMoney(summary.lateDeduction)}</div>
                  </>
                )}
                <div>UNDER TIME ( {formatPayslipHours(summary.undertimeHours)} HRS )</div>
                <div className="text-right">{formatPayslipMoney(summary.undertimeDeduction)}</div>
                <div>HDMF LOAN</div>
                <div className="text-right">{formatPayslipMoney(summary.loanDeduction)}</div>
                <div>SSS LOAN</div>
                <div className="text-right">-</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="grid grid-cols-[1fr_140px] border-r-2 border-black px-1 py-2">
              <div>NET SALARY</div>
              <div className="text-right">{formatPayslipMoney(netSalary, false)}</div>
              <div>Total Loans &amp; Other Deductions</div>
              <div className="text-right">{otherDeductions ? `(${formatPayslipMoney(otherDeductions)})` : '-'}</div>
              <div>Adjust</div>
              <div className="text-right">{formatPayslipMoney(summary.adjustment)}</div>
            </div>
            <div className="grid grid-cols-[1fr_190px] content-between">
              <div className="grid grid-cols-[1fr_190px] border-b-2 border-black font-bold">
                <div className="border-r-2 border-black px-1 py-2">Total Loans &amp; Other Deductions</div>
                <div className="px-1 py-2 text-right">{formatPayslipMoney(otherDeductions)}</div>
              </div>
              <div className="px-1 py-2">* For Internal Use Only</div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_140px] border-b-2 border-black px-1 py-1 font-bold">
            <div>NET PAY FOR THE PERIOD</div>
            <div className="text-right">{formatPayslipMoney(netPay, false)}</div>
          </div>
          <div className="px-1 py-1">
            Note: Your net salary is the amount you receive after deducting the required contributions from your total
            earnings for the previous month.
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsView({
  settings,
  periodDates,
  importText,
  onImportTextChange,
  onImport,
  onReset,
  onUpdateSettings,
}: {
  settings: WorkspaceState['settings']
  periodDates: string[]
  importText: string
  onImportTextChange: (value: string) => void
  onImport: () => void
  onReset: () => void
  onUpdateSettings: (patch: Partial<WorkspaceState['settings']>) => void
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold">Pay Period</h2>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="label">Company</label>
            <input
              value={settings.companyName}
              onChange={(event) => onUpdateSettings({ companyName: event.target.value })}
              className="input"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={settings.periodStart}
                onChange={(event) => onUpdateSettings({ periodStart: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={settings.periodEnd}
                onChange={(event) => onUpdateSettings({ periodEnd: event.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <SwitchRow label="SSS" checked={settings.deductSSS} onChange={(checked) => onUpdateSettings({ deductSSS: checked })} />
            <SwitchRow label="PhilHealth" checked={settings.deductPhilHealth} onChange={(checked) => onUpdateSettings({ deductPhilHealth: checked })} />
            <SwitchRow label="Pag-IBIG" checked={settings.deductPagIbig} onChange={(checked) => onUpdateSettings({ deductPagIbig: checked })} />
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{periodDates.length}</span> calendar days loaded
          </div>
        </div>
      </div>

      <div className="card no-print">
        <div className="card-header">
          <h2 className="text-base font-semibold">Import</h2>
        </div>
        <div className="card-body space-y-3">
          <textarea
            value={importText}
            onChange={(event) => onImportTextChange(event.target.value)}
            className="input min-h-36 font-mono text-xs"
            placeholder="ALA-001,2026-05-04,07:04,16:34,present,Faculty meeting"
          />
          <div className="flex flex-wrap justify-between gap-2">
            <button className="btn-secondary" onClick={onReset}>
              <RefreshCcw size={16} />
              Reset Data
            </button>
            <button className="btn-primary" onClick={onImport}>
              <Upload size={16} />
              Import Logs
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value, danger, strong }: { label: string; value: string; danger?: boolean; strong?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${danger ? 'text-rose-700' : strong ? 'text-cyan-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      {label}
      <Toggle checked={checked} onChange={onChange} />
    </label>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`h-5 w-9 rounded-full p-0.5 transition-colors ${checked ? 'bg-cyan-600' : 'bg-slate-300'}`}
    >
      <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  )
}

function rowTone(status: TimeLogStatus, incomplete: boolean) {
  if (incomplete) return 'bg-amber-50'
  if (status === 'absent') return 'bg-rose-50'
  if (status === 'holiday' || status === 'legal_holiday' || status === 'non_working_holiday' || status === 'paid_leave') return 'bg-emerald-50'
  if (status === 'rest_day') return 'bg-slate-50 text-slate-500'
  return 'bg-white'
}

function buildEmployeePayrollHistory(
  employee: EmployeeRecord,
  logs: TimeLogEntry[],
  settings: PayrollSettings
): PayrollHistoryEntry[] {
  const employeeLogs = logs.filter((log) => log.employeeId === employee.id)
  const groups = new Map<string, { periodStart: string; periodEnd: string; logs: TimeLogEntry[] }>()

  const addGroup = (periodStart: string, periodEnd: string, groupLogs: TimeLogEntry[]) => {
    const periodKey = `${periodStart}|${periodEnd}`
    const existing = groups.get(periodKey)
    if (existing) {
      existing.logs.push(...groupLogs)
      return
    }
    groups.set(periodKey, { periodStart, periodEnd, logs: [...groupLogs] })
  }

  const currentPeriodLogs = employeeLogs.filter((log) =>
    log.date >= settings.periodStart && log.date <= settings.periodEnd
  )
  if (employee.active || currentPeriodLogs.length > 0) {
    addGroup(settings.periodStart, settings.periodEnd, currentPeriodLogs)
  }

  for (const log of employeeLogs) {
    if (log.date >= settings.periodStart && log.date <= settings.periodEnd) continue
    const period = getSemiMonthlyPeriodForDate(log.date)
    addGroup(period.periodStart, period.periodEnd, [log])
  }

  return Array.from(groups.entries())
    .map(([periodKey, group]) => ({
      periodKey,
      periodStart: group.periodStart,
      periodEnd: group.periodEnd,
      logs: group.logs.sort((a, b) => a.date.localeCompare(b.date)),
      summary: computeEmployeePayroll(
        employee,
        group.logs,
        { ...settings, periodStart: group.periodStart, periodEnd: group.periodEnd },
        DEFAULT_SSS_BRACKETS
      ),
    }))
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
}

function getSemiMonthlyPeriodForDate(dateKey: string) {
  const date = parseDateKey(dateKey)
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const startDay = day <= 15 ? 1 : 16
  const endDay = day <= 15 ? 15 : new Date(year, month + 1, 0).getDate()

  return {
    periodStart: [
      year,
      String(month + 1).padStart(2, '0'),
      String(startDay).padStart(2, '0'),
    ].join('-'),
    periodEnd: [
      year,
      String(month + 1).padStart(2, '0'),
      String(endDay).padStart(2, '0'),
    ].join('-'),
  }
}

function getPayslipType(periodEnd: string): string {
  return parseDateKey(periodEnd).getDate() <= 15 ? '15TH' : '30TH'
}

function formatPayslipDate(dateKey: string): string {
  const date = parseDateKey(dateKey)
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

function formatPayslipPeriod(periodStart: string, periodEnd: string): string {
  const start = parseDateKey(periodStart)
  const end = parseDateKey(periodEnd)
  const startMonth = start.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase()
  const endMonth = end.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase()

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} TO ${end.getDate()}, ${end.getFullYear()}`
  }

  return `${startMonth} ${start.getDate()}, ${start.getFullYear()} TO ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
}

function formatPayslipMoney(amount: number, dashForZero = true): string {
  if (dashForZero && Math.abs(amount) < 0.005) return '-'
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPayslipHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2)
}

function printPayslip() {
  const cleanup = () => document.body.classList.remove('printing-payslip')

  document.body.classList.add('printing-payslip')
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
  window.setTimeout(cleanup, 500)
}

function importTextIntoWorkspace(
  current: WorkspaceState,
  text: string,
  fallbackEmployeeId: string
) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return {
      workspace: current,
      imported: 0,
      skipped: 0,
      hasRows: false,
    }
  }

  let imported = 0
  let skipped = 0
  const employeesByCode = new Map(current.employees.map((employee) => [employee.code.toUpperCase(), employee]))
  const nextLogs = [...current.logs]
  const logIndex = new Map(nextLogs.map((log, index) => [`${log.employeeId}-${log.date}`, index]))

  for (const line of lines) {
    const cells = splitImportLine(line)
    if (cells[0]?.toLowerCase() === 'code') continue

    const hasCode = employeesByCode.has((cells[0] || '').toUpperCase())
    const employee = hasCode
      ? employeesByCode.get(cells[0].toUpperCase())
      : current.employees.find((candidate) => candidate.id === fallbackEmployeeId)

    const date = normalizeImportDate(
      hasCode ? cells[1] : cells[0],
      current.settings.periodStart,
      current.settings.periodEnd
    )
    const statusText = hasCode ? cells[4] : cells[3]
    const status = statusText ? normalizeStatus(statusText) : 'present'
    const timeIn = status === 'present' ? normalizeTimeCell(hasCode ? cells[2] : cells[1], 0) : ''
    const timeOut = status === 'present' ? normalizeTimeCell(hasCode ? cells[3] : cells[2], 1) : ''
    const notes = hasCode ? cells.slice(5).join(', ') : cells.slice(4).join(', ')

    if (!employee || !date) {
      skipped += 1
      continue
    }

    const key = `${employee.id}-${date}`
    const index = logIndex.get(key)
    const baseLog = index === undefined
      ? {
          id: key,
          employeeId: employee.id,
          date,
          status: 'present' as TimeLogStatus,
          timeIn: '',
          timeOut: '',
          otApproved: false,
          notes: '',
        }
      : nextLogs[index]

    const nextLog: TimeLogEntry = {
      ...baseLog,
      status,
      timeIn,
      timeOut,
      notes: notes || baseLog.notes,
    }

    if (nextLog.status !== 'present') {
      nextLog.timeIn = ''
      nextLog.timeOut = ''
      nextLog.otApproved = false
    }

    if (index === undefined) {
      logIndex.set(key, nextLogs.length)
      nextLogs.push(nextLog)
    } else {
      nextLogs[index] = nextLog
    }
    imported += 1
  }

  return {
    workspace: { ...current, logs: nextLogs },
    imported,
    skipped,
    hasRows: true,
  }
}

function convertOcrDtrTextToImportRows(
  rawText: string,
  periodStart: string,
  periodEnd: string
): string {
  return rawText
    .split(/\r?\n/)
    .map((line) => parseOcrDtrLine(line, periodStart, periodEnd))
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

function parseOcrDtrLine(line: string, periodStart: string, periodEnd: string): string | null {
  const compact = line.replace(/\s+/g, ' ').trim()
  if (!compact) return null

  const date = extractDateFromOcrLine(compact, periodStart, periodEnd)
  if (!date) return null

  const status = inferStatusFromLine(compact)
  const times = extractTimesFromOcrLine(compact)
  if (status === 'present' && times.length === 0) return null

  const timeIn = status === 'present' ? times[0] || '' : ''
  const timeOut = status === 'present' ? times[1] || '' : ''
  const notes = compact.replace(/,/g, ' ')

  return [date, timeIn, timeOut, status, notes].join(',')
}

function extractDateFromOcrLine(line: string, periodStart: string, periodEnd: string): string | null {
  const periodStartDate = parseDateKey(periodStart)
  const periodEndDate = parseDateKey(periodEnd)

  const isoMatch = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (isoMatch) return makeDateKey(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]), periodStart, periodEnd)

  const numericDate = line.match(/\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](20\d{2}))?\b/)
  if (numericDate) {
    const year = numericDate[3] ? Number(numericDate[3]) : periodStartDate.getFullYear()
    return makeDateKey(year, Number(numericDate[1]), Number(numericDate[2]), periodStart, periodEnd)
  }

  const monthDate = line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\b/i)
  if (monthDate) {
    const month = monthNameToNumber(monthDate[1])
    return makeDateKey(periodStartDate.getFullYear(), month, Number(monthDate[2]), periodStart, periodEnd)
  }

  const leadingDay = line.match(/^\D*(\d{1,2})(?=\D)/)
  if (leadingDay) {
    const day = Number(leadingDay[1])
    const inStartMonth = makeDateKey(periodStartDate.getFullYear(), periodStartDate.getMonth() + 1, day, periodStart, periodEnd)
    if (inStartMonth) return inStartMonth

    if (periodEndDate.getMonth() !== periodStartDate.getMonth()) {
      return makeDateKey(periodEndDate.getFullYear(), periodEndDate.getMonth() + 1, day, periodStart, periodEnd)
    }
  }

  return null
}

function extractTimesFromOcrLine(line: string): string[] {
  const normalized = line
    .replace(/[Oo]/g, '0')
    .replace(/[|]/g, '1')
  const times: string[] = []
  const pattern = /\b([01]?\d|2[0-3])\s*[:.]\s*([0-5]\d)\s*([AaPp]\.?\s?[Mm]\.?)?\b/g

  let match = pattern.exec(normalized)
  while (match) {
    times.push(normalizeTimeParts(match[1], match[2], match[3], times.length))
    match = pattern.exec(normalized)
  }

  return times
}

function inferStatusFromLine(line: string): TimeLogStatus {
  if (/\b(abs|absent)\b/i.test(line)) return 'absent'
  if (/\b(leave|vl|sl|paid leave)\b/i.test(line)) return 'paid_leave'
  if (/\b(legal|regular)\s+(holiday|hol)\b/i.test(line)) return 'legal_holiday'
  if (/\b(non[-\s]?working|special)\s+(holiday|hol)\b/i.test(line)) return 'non_working_holiday'
  if (/\b(holiday|hol)\b/i.test(line)) return 'legal_holiday'
  if (/\b(rest|off|rd)\b/i.test(line)) return 'rest_day'
  return 'present'
}

function normalizeImportDate(value: string | undefined, periodStart: string, periodEnd: string): string | null {
  if (!value) return null
  return extractDateFromOcrLine(value, periodStart, periodEnd)
}

function normalizeTimeCell(value: string | undefined, position: number): string {
  if (!value) return ''
  const match = value
    .replace(/[Oo]/g, '0')
    .match(/\b([01]?\d|2[0-3])\s*[:.]\s*([0-5]\d)\s*([AaPp]\.?\s?[Mm]\.?)?\b/)

  return match ? normalizeTimeParts(match[1], match[2], match[3], position) : value
}

function normalizeTimeParts(hourValue: string, minuteValue: string, meridiemValue: string | undefined, position: number): string {
  let hour = Number(hourValue)
  const minute = Number(minuteValue)
  const meridiem = meridiemValue?.replace(/[^apm]/gi, '').toLowerCase()

  if (meridiem?.startsWith('p') && hour < 12) hour += 12
  if (meridiem?.startsWith('a') && hour === 12) hour = 0
  if (!meridiem && position > 0 && hour > 0 && hour < 12) hour += 12

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function makeDateKey(year: number, month: number, day: number, periodStart: string, periodEnd: string): string | null {
  if (!year || !month || !day) return null
  const candidate = new Date(year, month - 1, day)
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return null
  }

  const key = [
    candidate.getFullYear(),
    String(candidate.getMonth() + 1).padStart(2, '0'),
    String(candidate.getDate()).padStart(2, '0'),
  ].join('-')

  return key >= periodStart && key <= periodEnd ? key : null
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function monthNameToNumber(value: string): number {
  const month = value.slice(0, 3).toLowerCase()
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month) + 1
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function splitImportLine(line: string): string[] {
  return line
    .split(/\t|,/)
    .map((cell) => cell.trim().replace(/^"|"$/g, ''))
}

function numberFromInput(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function loadWorkspace(): WorkspaceState {
  const fallback = createDefaultWorkspace()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as WorkspaceState
    const mergedEmployees = parsed.employees?.length ? parsed.employees : fallback.employees

    return migrateWorkspace({
      ...fallback,
      ...parsed,
      settings: { ...fallback.settings, ...parsed.settings },
      employees: mergedEmployees,
      logs: parsed.logs?.length ? parsed.logs : fallback.logs,
    })
  } catch {
    return fallback
  }
}

function migrateWorkspace(workspace: WorkspaceState): WorkspaceState {
  const employeesById = new Map(workspace.employees.map((employee) => [employee.id, employee]))

  return {
    ...workspace,
    logs: workspace.logs.map((log) => {
      const holiday = HOLIDAYS_2026[log.date]
      const employee = employeesById.get(log.employeeId)
      const untouchedDefaultLog = employee &&
        log.status === 'present' &&
        log.timeIn === employee.schedule.start &&
        log.timeOut === employee.schedule.end &&
        !log.notes

      if (!holiday || !untouchedDefaultLog) return log

      return {
        ...log,
        status: holiday.status,
        timeIn: '',
        timeOut: '',
        otApproved: false,
        notes: holiday.name,
      }
    }),
  }
}

function saveWorkspace(workspace: WorkspaceState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } catch {
    // Local storage can fail in private contexts; the app still works in memory.
  }
}

function downloadCsv(fileName: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string | number) {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}
