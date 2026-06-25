import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastProvider } from './components/ui/Toast'
import Sidebar from './components/ui/Sidebar'
import LoginPage from './pages/LoginPage'
import Overview from './pages/Overview'
import Products from './pages/Products'
import Orders from './pages/Orders'
import { Customers, Categories, Discounts } from './pages/OtherPages'
import SettingsPage from './pages/SettingsPage'

const PAGE_TITLES = {
  overview: 'Overview', products: 'Products', orders: 'Orders',
  customers: 'Customers', categories: 'Categories', discounts: 'Discounts', settings: 'Settings',
}

function AdminApp() {
  const { user, profile, loading, isAdmin } = useAuth()
  const [tab, setTab] = useState('overview')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (!user) return <LoginPage />

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your account does not have admin privileges.</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>Signed in as: <strong style={{ color: 'var(--text)' }}>{user.email}</strong></p>
      </div>
    </div>
  )

  const PAGES = {
    overview: <Overview setTab={setTab} />,
    products: <Products />,
    orders: <Orders />,
    customers: <Customers />,
    categories: <Categories />,
    discounts: <Discounts />,
    settings: <SettingsPage />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar tab={tab} setTab={setTab} />
      <main style={{ marginLeft: 'var(--sidebar)', flex: 1, padding: '28px 32px', minHeight: '100vh', maxWidth: 'calc(100vw - var(--sidebar))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{PAGE_TITLES[tab]}</h1>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-green" style={{ fontSize: 11 }}>● Live</span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              {(profile?.display_name || user.email)?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
        {PAGES[tab]}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <AdminApp />
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}
