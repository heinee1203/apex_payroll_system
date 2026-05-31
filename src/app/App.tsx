import { useState, type FormEvent } from 'react'
import { Toaster, toast } from 'sonner'
import { PayrollWorkspace } from '../features/workspace/PayrollWorkspace'

const AUTH_SESSION_KEY = 'apex-payroll-authenticated'
const AUTH_EMAIL = 'admin@apex.com'
const AUTH_PASSWORD_HASH = 'b45a3bb8623d2ac9c258d2f7477bb42d32db59e7f94f2d493b3cdf5626e65136'

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(AUTH_SESSION_KEY) === 'true')

  const handleAuthenticated = () => {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true')
    setAuthenticated(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setAuthenticated(false)
    toast.success('Signed out')
  }

  return (
    <>
      {authenticated ? (
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
      const passwordHash = await hashPassword(password)
      const valid = email.trim().toLowerCase() === AUTH_EMAIL && passwordHash === AUTH_PASSWORD_HASH

      if (!valid) {
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

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
