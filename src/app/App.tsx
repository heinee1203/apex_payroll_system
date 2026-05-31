import { Toaster } from 'sonner'
import { PayrollWorkspace } from '../features/workspace/PayrollWorkspace'

export default function App() {
  return (
    <>
      <PayrollWorkspace />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
