import { ExternalLink, LayoutDashboard, LogOut, Package, Percent, Settings, ShoppingBag, Tag, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'

const NAV = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { key: 'products', label: 'Products', icon: <Package size={16} /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBag size={16} /> },
  { key: 'customers', label: 'Customers', icon: <Users size={16} /> },
  { key: 'categories', label: 'Categories', icon: <Tag size={16} /> },
  { key: 'discounts', label: 'Discounts', icon: <Percent size={16} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={16} /> },
]

export default function Sidebar({ tab, setTab }) {
  const { profile, user, signOut } = useAuth()
  const { get } = useSettings()
  const siteName = get('site_name', 'VoidEnterprises')
  const shopUrl = import.meta.env.VITE_SHOP_URL || 'https://voidenterprises.xyz'

  return (
    <aside style={{
      width: 'var(--sidebar)', position: 'fixed', top: 0, left: 0, bottom: 0,
      background: 'var(--card)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100
    }}>
      {/* Header */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff', flexShrink: 0
          }}>
            {siteName[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{siteName}</div>
            <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        <div style={{ padding: '6px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Navigation</div>
        {NAV.map(item => (
          <button key={item.key} className={`sidebar-item ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0 8px' }}>
        <a href={shopUrl} target="_blank" rel="noreferrer" className="sidebar-item" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', padding: '9px 14px', borderRadius: 8, margin: '1px 8px', fontSize: 13, fontWeight: 500 }}>
          <ExternalLink size={15} /> View Storefront
        </a>
        <button className="sidebar-item danger" onClick={signOut} style={{ color: 'var(--muted)' }}>
          <LogOut size={15} /> Sign Out
        </button>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.display_name || 'Admin'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        </div>
      </div>
    </aside>
  )
}
