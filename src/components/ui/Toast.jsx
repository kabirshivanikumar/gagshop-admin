import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastCtx = createContext({})
let tid = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const add = useCallback((message, type = 'info', ms = 4000) => {
    const id = ++tid
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms)
  }, [])
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])
  const toast = { success: m => add(m, 'success'), error: m => add(m, 'error'), info: m => add(m, 'info') }
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle size={15} color="var(--success)" />}
            {t.type === 'error' && <XCircle size={15} color="var(--danger)" />}
            {t.type === 'info' && <Info size={15} color="var(--primary)" />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="btn-ghost" style={{ padding: 3 }} onClick={() => remove(t.id)}><X size={12} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
