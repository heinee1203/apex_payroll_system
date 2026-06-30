import { useEffect, useState, type FormEvent } from 'react'
import { Toaster, toast } from 'sonner'
import { PayrollWorkspace } from '../features/workspace/PayrollWorkspace'

type AuthState = 'checking' | 'authenticated' | 'unauthenticated'

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking')

  useEffect(() => {
    let cancelled = false

    fetch('/api/session', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() as Promise<{ authenticated: boolean }> : { authenticated: false })
      .then((session) => {
        if (!cancelled) setAuthState(session.authenticated ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!cancelled) setAuthState('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleAuthenticated = () => {
    setAuthState('authenticated')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
    } finally {
      setAuthState('unauthenticated')
    }
    toast.success('Signed out')
  }

  return (
    <>
      {authState === 'checking' ? (
        <SessionLoadingPage />
      ) : authState === 'authenticated' ? (
        <PayrollWorkspace onLogout={handleLogout} />
      ) : (
        <LoginPage onAuthenticated={handleAuthenticated} />
      )}
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}

function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        toast.error('Invalid username or password')
        return
      }

      onAuthenticated()
      toast.success('Signed in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-950">
      <form onSubmit={submitLogin} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">Apex</p>
          <h1 className="mt-1 text-2xl font-bold">Payroll Calculator</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue.</p>
        </div>

        <label className="label" htmlFor="login-email">Username</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input mb-4"
          required
        />

        <label className="label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input mb-6"
          required
        />

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}

function SessionLoadingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Apex</p>
        <h1 className="mt-1 text-2xl font-bold">Payroll Calculator</h1>
        <p className="mt-2 text-sm text-slate-300">Checking session...</p>
      </div>
    </main>
  )
}
