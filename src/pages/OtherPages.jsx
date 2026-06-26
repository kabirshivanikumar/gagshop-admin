import { useState, useEffect } from 'react'
import { Search, Shield, User, RefreshCw, Plus, Pencil, Trash2, X, GripVertical, Copy, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'

// ─── CUSTOMERS ────────────────────────────────────────────────────
export function Customers() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])
  async function load() { setLoading(true); const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); setUsers(data || []); setLoading(false) }

  async function toggleRole(id, cur) {
    const next = cur === 'admin' ? 'customer' : 'admin'
    if (id === me?.id && next !== 'admin' && !confirm('Remove your own admin access?')) return
    await supabase.from('profiles').update({ role: next }).eq('id', id)
    setUsers(us => us.map(u => u.id === id ? { ...u, role: next } : u))
    toast.success(`Role → ${next}`)
  }

  const filtered = users.filter(u => [u.display_name, u.roblox_username, u.username].some(f => (f || '').toLowerCase().includes(search.toLowerCase())))

  return (
    <div>
      <div className="section-header">
        <div className="search-box" style={{ flex: 1, maxWidth: 320 }}><Search size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." /></div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>User</th><th>Roblox Username</th><th>Role</th><th>Joined</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-md" style={{ margin: '0 auto' }} /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No users</td></tr>
              : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {(u.display_name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>{u.display_name || u.username || 'Unknown'}</div><div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{u.id.slice(0, 8)}…</div></div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{u.roblox_username || '—'}</td>
                  <td><span className={`badge badge-${u.role === 'admin' ? 'blue' : 'gray'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}{u.role}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className={`btn btn-sm ${u.role === 'admin' ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleRole(u.id, u.role)}>{u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</button></div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>{filtered.length} users · {users.filter(u => u.role === 'admin').length} admins</div>
    </div>
  )
}

// ─── CATEGORIES ───────────────────────────────────────────────────
const CAT_EMPTY = { name: '', slug: '', description: '', image_url: '', display_order: 0 }
const toSlug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function Categories() {
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(CAT_EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() { setLoading(true); const { data } = await supabase.from('categories').select('*').order('display_order'); setCats(data || []); setLoading(false) }

  async function save() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const payload = { ...form, slug: form.slug || toSlug(form.name) }
      if (modal === 'add') { delete payload.id; const { error } = await supabase.from('categories').insert(payload); if (error) throw error; toast.success('Created!') }
      else { const { error } = await supabase.from('categories').update(payload).eq('id', form.id); if (error) throw error; toast.success('Updated!') }
      setModal(null); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('Delete category?')) return
    await supabase.from('categories').delete().eq('id', id)
    toast.success('Deleted'); load()
  }

  return (
    <div>
      <div className="section-header"><span /><button className="btn btn-primary" onClick={() => { setForm(CAT_EMPTY); setModal('add') }}><Plus size={15} /> Add Category</button></div>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cats.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No categories yet</div>}
          {cats.map(c => (
            <div key={c.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <GripVertical size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
              <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(99,102,241,0.1)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.image_url ? <img src={c.image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>🎮</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>/{c.slug} · Order {c.display_order}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm(c); setModal('edit') }}><Pencil size={12} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="flex-between mb-4"><h3 style={{ fontWeight: 700 }}>{modal === 'add' ? 'Add Category' : 'Edit Category'}</h3><button className="btn-ghost" onClick={() => setModal(null)}><X size={18} /></button></div>
            <div className="form-group"><label className="form-label">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} placeholder="Game Passes" /></div>
            <div className="form-group"><label className="form-label">Slug</label><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="game-passes" /><div className="form-hint">Auto-generated from name</div></div>
            <div className="form-group"><label className="form-label">Description</label><textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Image URL</label><input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="form-group"><label className="form-label">Display Order</label><input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner spinner-sm" /> : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DISCOUNTS ────────────────────────────────────────────────────
const DISC_EMPTY = { code: '', type: 'percent', value: '', min_order: 0, max_uses: '', is_active: true, expires_at: '' }
const rndCode = () => 'RBX' + Math.random().toString(36).slice(2, 7).toUpperCase()

export function Discounts() {
  const { get } = useSettings()
  const toast = useToast()
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(DISC_EMPTY)
  const [saving, setSaving] = useState(false)
  const cur = get('currency_symbol', '$')

  useEffect(() => { load() }, [])
  async function load() { setLoading(true); const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false }); setCodes(data || []); setLoading(false) }

  async function save() {
    if (!form.code || !form.value) { toast.error('Code and value required'); return }
    setSaving(true)
    try {
      const p = { ...form, code: form.code.trim().toUpperCase(), value: parseFloat(form.value), min_order: parseFloat(form.min_order) || 0, max_uses: form.max_uses ? parseInt(form.max_uses) : null, expires_at: form.expires_at || null }
      delete p.id
      const { error } = await supabase.from('discount_codes').insert(p)
      if (error) throw error
      toast.success('Code created!'); setModal(false); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function del(id) { if (!confirm('Delete code?')) return; await supabase.from('discount_codes').delete().eq('id', id); toast.success('Deleted'); load() }
  async function toggle(id, v) { await supabase.from('discount_codes').update({ is_active: v }).eq('id', id); setCodes(cs => cs.map(c => c.id === id ? { ...c, is_active: v } : c)) }

  return (
    <div>
      <div className="section-header"><span /><button className="btn btn-primary" onClick={() => { setForm({ ...DISC_EMPTY, code: rndCode() }); setModal(true) }}><Plus size={15} /> Create Code</button></div>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>
        : codes.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div><h3>No discount codes yet</h3></div>
        : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Uses</th><th>Expires</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 5 }}>{c.code}</span>
                        <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied!') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}><Copy size={12} /></button>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{c.type}</td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{c.type === 'percent' ? `${c.value}%` : `${cur}${Number(c.value).toFixed(2)}`}</td>
                    <td style={{ fontSize: 12 }}>{c.min_order > 0 ? `${cur}${Number(c.min_order).toFixed(2)}` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                    <td><button onClick={() => toggle(c.id, !c.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.is_active ? 'var(--success)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>{c.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}{c.is_active ? 'Active' : 'Off'}</button></td>
                    <td><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-danger btn-sm" onClick={() => del(c.id)}><Trash2 size={12} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="flex-between mb-4"><h3 style={{ fontWeight: 700 }}>Create Discount Code</h3><button className="btn-ghost" onClick={() => setModal(false)}><X size={18} /></button></div>
            <div className="form-group"><label className="form-label">Code *</label><div style={{ display: 'flex', gap: 8 }}><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" /><button className="btn btn-secondary btn-sm" onClick={() => setForm(f => ({ ...f, code: rndCode() }))} style={{ flexShrink: 0 }}>Random</button></div></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option value="percent">Percentage (%)</option><option value="fixed">Fixed ({cur})</option></select></div>
              <div className="form-group"><label className="form-label">Value *</label><input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percent' ? '20' : '5.00'} /></div>
              <div className="form-group"><label className="form-label">Min Order</label><input type="number" min="0" step="0.01" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} placeholder="0" /></div>
              <div className="form-group"><label className="form-label">Max Uses</label><input type="number" min="0" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" /></div>
            </div>
            <div className="form-group"><label className="form-label">Expiry</label><input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 18 }}><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} />Active immediately</label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner spinner-sm" /> : 'Create Code'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
