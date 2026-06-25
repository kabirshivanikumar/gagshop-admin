import { useEffect, useState } from 'react'
import { ArrowUpRight, DollarSign, Package, ShoppingBag, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'

const STATUS_COLOR = {
  pending: 'var(--warning)', paid: 'var(--success)', processing: 'var(--primary)',
  completed: 'var(--success)', cancelled: 'var(--danger)', refunded: 'var(--muted)',
}

export default function Overview({ setTab }) {
  const { get } = useSettings()
  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0, products: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const cur = get('currency_symbol', '$')

  useEffect(() => { load() }, [])

  async function load() {
    const [oRes, cRes, pRes, rRes] = await Promise.all([
      supabase.from('orders').select('total, status'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer'),
      supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(8),
    ])
    const orders = oRes.data || []
    const revenue = orders.filter(o => ['paid', 'completed'].includes(o.status)).reduce((s, o) => s + Number(o.total), 0)
    setStats({ revenue, orders: orders.length, customers: cRes.count || 0, products: pRes.count || 0 })
    setRecent(rRes.data || [])
    setLoading(false)
  }

  const CARDS = [
    { label: 'Total Revenue', value: `${cur}${stats.revenue.toFixed(2)}`, icon: <DollarSign size={20} />, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)', tab: null },
    { label: 'Total Orders', value: stats.orders, icon: <ShoppingBag size={20} />, color: 'var(--primary)', bg: 'rgba(99,102,241,0.1)', tab: 'orders' },
    { label: 'Customers', value: stats.customers, icon: <Users size={20} />, color: 'var(--accent)', bg: 'rgba(6,182,212,0.1)', tab: 'customers' },
    { label: 'Active Products', value: stats.products, icon: <Package size={20} />, color: 'var(--secondary)', bg: 'rgba(139,92,246,0.1)', tab: 'products' },
  ]

  return (
    <div>
      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {CARDS.map(c => (
          <div key={c.label} className="card stat-card" style={{ cursor: c.tab ? 'pointer' : 'default' }} onClick={() => c.tab && setTab(c.tab)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                {c.icon}
              </div>
              {c.tab && <ArrowUpRight size={14} color="var(--muted)" />}
            </div>
            <div className="stat-value">{loading ? '—' : c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent orders */}
        <div className="card" style={{ padding: 20, gridColumn: '1/-1' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">Recent Orders</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setTab('orders')}>View All</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th><th>Roblox</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}><div className="spinner spinner-md" style={{ margin: '0 auto' }} /></td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No orders yet</td></tr>
              ) : recent.map(o => (
                <tr key={o.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{o.order_number}</span></td>
                  <td style={{ fontSize: 12 }}>{o.roblox_username || '—'}</td>
                  <td style={{ fontSize: 12 }}>{o.items?.length || 0}</td>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{cur}{Number(o.total).toFixed(2)}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[o.status] || 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[o.status] || 'var(--muted)', display: 'inline-block', flexShrink: 0 }} />
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
