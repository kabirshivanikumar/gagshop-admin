import { useState, useEffect } from 'react'
import { Search, RefreshCw, X, CheckCircle, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../components/ui/Toast'

const STATUSES = ['pending', 'paid', 'processing', 'completed', 'cancelled', 'refunded']
const SC = { pending: 'yellow', paid: 'green', processing: 'blue', completed: 'green', cancelled: 'red', refunded: 'gray' }
const SCV = { pending: 'var(--warning)', paid: 'var(--success)', processing: 'var(--primary)', completed: 'var(--success)', cancelled: 'var(--danger)', refunded: 'var(--muted)' }

export default function Orders() {
  const { get } = useSettings()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const cur = get('currency_symbol', '$')

  useEffect(() => { fetchOrders() }, [filterStatus])

  async function fetchOrders() {
    setLoading(true)
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o))
    if (selected?.id === id) setSelected(s => ({ ...s, status }))
    toast.success(`Status → ${status}`)
  }

  const filtered = orders.filter(o =>
    (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.roblox_username || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.guest_email || '').toLowerCase().includes(search.toLowerCase())
  )

  // Reads proof properties dynamically depending on how your columns are named
  const getProofUrl = (order) => order?.proof_url || order?.receipt_url || order?.payment_proof || null

  return (
    <div>
      <div className="section-header">
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order #, Roblox, email..." />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchOrders}><RefreshCw size={13} /></button>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => { const n = orders.filter(o => o.status === s).length; if (!n) return null; return (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className={`badge badge-${filterStatus === s ? SC[s] : 'gray'}`}
            style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 11, fontWeight: 700, border: filterStatus === s ? undefined : '1px solid var(--border)' }}>
            {s} {n}
          </button>
        )})}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Order #</th><th>Roblox</th><th>Email</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-md" style={{ margin: '0 auto' }} /></td></tr>
                  : filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No orders</td></tr>
                  : filtered.map(o => (
                    <tr key={o.id} onClick={() => setSelected(selected?.id === o.id ? null : o)} style={{ cursor: 'pointer', background: selected?.id === o.id ? 'rgba(99,102,241,0.07)' : '' }}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{o.order_number}</span></td>
                      <td style={{ fontSize: 12 }}>{o.roblox_username || '—'}</td>
                      <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.guest_email || '—'}</td>
                      <td style={{ fontSize: 12 }}>{o.items?.length || 0}</td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{cur}{Number(o.total).toFixed(2)}</td>
                      <td style={{ fontSize: 12, textTransform: 'capitalize' }}>
                        {o.payment_method || '—'} {getProofUrl(o) && <span style={{ fontSize: 10, color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '2px 5px', borderRadius: 4, marginLeft: 4 }}>📎 Proof</span>}
                      </td>
                      <td>
                        <select value={o.status} onChange={e => { e.stopPropagation(); updateStatus(o.id, e.target.value) }} onClick={e => e.stopPropagation()}
                          style={{ width: 'auto', padding: '3px 8px', fontSize: 11, fontWeight: 600, color: SCV[o.status], background: `${SCV[o.status]}18`, border: `1px solid ${SCV[o.status]}40`, borderRadius: 6 }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="card" style={{ padding: 20, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', alignSelf: 'start' }}>
            <div className="flex-between mb-4"><span style={{ fontWeight: 700, fontSize: 14 }}>Order Detail</span><button className="btn-ghost" onClick={() => setSelected(null)}><X size={16} /></button></div>
            {[
              ['Order #', <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{selected.order_number}</span>],
              ['Status', <select value={selected.status} onChange={e => updateStatus(selected.id, e.target.value)} style={{ width: 'auto', padding: '3px 8px', fontSize: 12, color: SCV[selected.status], fontWeight: 600 }}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>],
              ['Date', new Date(selected.created_at).toLocaleString()],
              ['Roblox', selected.roblox_username || '—'],
              ['Email', selected.guest_email || '—'],
              ['Payment', selected.payment_method],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}

            {/* NEW EXTENDED MODULE: Dynamic Payment Verification Window */}
            {getProofUrl(selected) ? (
              <>
                <div className="divider" />
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Customer Payment Proof</span>
                  <a href={getProofUrl(selected)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--primary)', fontSize: 11, textTransform: 'none' }}>
                    Open <ExternalLink size={10} />
                  </a>
                </div>
                <div style={{ position: 'relative', width: '100%', maxHeight: 180, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', marginBottom: 12 }}>
                  <img src={getProofUrl(selected)} alt="Receipt attachment verification block" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 180, display: 'block' }} />
                </div>
                {selected.status === 'pending' && (
                  <button className="btn btn-primary" onClick={() => updateStatus(selected.id, 'paid')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--success)', borderColor: 'var(--success)', color: '#fff', fontSize: 12, padding: '8px 12px' }}>
                    <CheckCircle size={14} /> Approve & Mark as Paid
                  </button>
                )}
              </>
            ) : (
              selected.payment_method !== 'paypal' && selected.payment_method !== 'stripe' && (
                <>
                  <div className="divider" />
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '8px 0', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px dashed var(--border)' }}>
                    No manual transaction file uploaded yet.
                  </div>
                </>
              )
            )}

            <div className="divider" />
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</div>
            {selected.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <div><div style={{ fontWeight: 500 }}>{item.name}</div><div style={{ color: 'var(--muted)', fontSize: 11 }}>x{item.quantity}</div></div>
                <span style={{ fontWeight: 700 }}>{cur}{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="divider" />
            {[['Subtotal', `${cur}${Number(selected.subtotal).toFixed(2)}`], selected.tax > 0 && ['Tax', `${cur}${Number(selected.tax).toFixed(2)}`], ['Total', `${cur}${Number(selected.total).toFixed(2)}`]].filter(Boolean).map(([k, v], i, a) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, fontWeight: i === a.length - 1 ? 800 : 400, color: i === a.length - 1 ? 'var(--primary)' : 'inherit' }}>
                <span style={{ color: i === a.length - 1 ? 'var(--text)' : 'var(--muted)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            {selected.notes && <><div className="divider" /><div style={{ fontSize: 12, color: 'var(--muted)' }}><strong style={{ color: 'var(--text)' }}>Notes:</strong> {selected.notes}</div></>}
          </div>
        )}
      </div>
    </div>
  )
}
