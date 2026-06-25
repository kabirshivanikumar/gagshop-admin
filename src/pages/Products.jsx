import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Star, Eye, EyeOff, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../components/ui/Toast'

const EMPTY = { name: '', description: '', price: '', compare_price: '', image_url: '', images: [], category_id: '', stock: -1, is_active: true, is_featured: false, badge: '', delivery_type: 'instant', delivery_info: '', tags: [], sort_order: 0 }

export default function Products() {
  const { get } = useSettings()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [extraImgs, setExtraImgs] = useState('')
  const cur = get('currency_symbol', '$')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [pR, cR] = await Promise.all([
      supabase.from('products').select('*, categories(name)').order('sort_order').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('display_order')
    ])
    setProducts((pR.data || []).map(p => ({ ...p, category_name: p.categories?.name })))
    setCategories(cR.data || [])
    setLoading(false)
  }

  function openAdd() { setForm(EMPTY); setTagInput(''); setExtraImgs(''); setModal('add') }
  function openEdit(p) { setForm({ ...p, price: String(p.price), compare_price: String(p.compare_price || '') }); setTagInput(''); setExtraImgs((p.images || []).join('\n')); setModal('edit') }

  async function save() {
    if (!form.name || !form.price) { toast.error('Name and price required'); return }
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), compare_price: form.compare_price ? parseFloat(form.compare_price) : null, stock: parseInt(form.stock), category_id: form.category_id || null, images: extraImgs.split('\n').map(s => s.trim()).filter(Boolean), updated_at: new Date().toISOString() }
      delete payload.categories; delete payload.category_name
      if (modal === 'add') { delete payload.id; const { error } = await supabase.from('products').insert(payload); if (error) throw error; toast.success('Product created!') }
      else { const { error } = await supabase.from('products').update(payload).eq('id', form.id); if (error) throw error; toast.success('Product updated!') }
      setModal(null); fetchAll()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    toast.success('Deleted'); fetchAll()
  }

  async function toggleActive(id, v) { await supabase.from('products').update({ is_active: v }).eq('id', id); setProducts(ps => ps.map(p => p.id === id ? { ...p, is_active: v } : p)) }
  async function toggleFeatured(id, v) { await supabase.from('products').update({ is_featured: v }).eq('id', id); setProducts(ps => ps.map(p => p.id === id ? { ...p, is_featured: v } : p)) }

  function addTag() { const t = tagInput.trim(); if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] })); setTagInput('') }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="section-header">
        <div className="search-box" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Product</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th><th>Featured</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-md" style={{ margin: '0 auto' }} /></td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No products</td></tr>
                : filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>🎮</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          {p.badge && <span className={`badge badge-${p.badge.toLowerCase() === 'new' ? 'green' : p.badge.toLowerCase() === 'hot' ? 'red' : p.badge.toLowerCase() === 'sale' ? 'yellow' : 'blue'}`}>{p.badge}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.category_name || '—'}</td>
                    <td><div style={{ fontWeight: 700, fontSize: 13 }}>{cur}{Number(p.price).toFixed(2)}</div>{p.compare_price > p.price && <div style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--muted)' }}>{cur}{Number(p.compare_price).toFixed(2)}</div>}</td>
                    <td style={{ fontSize: 12 }}>{p.stock === -1 ? '∞' : p.stock}</td>
                    <td>
                      <button onClick={() => toggleActive(p.id, !p.is_active)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.is_active ? 'var(--success)' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {p.is_active ? <Eye size={13} /> : <EyeOff size={13} />} {p.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(p.id, !p.is_featured)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_featured ? 'var(--warning)' : 'var(--muted)' }}>
                        <Star size={15} fill={p.is_featured ? 'var(--warning)' : 'none'} />
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}><Pencil size={12} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="flex-between mb-4"><h3 style={{ fontWeight: 700, fontSize: 16 }}>{modal === 'add' ? 'Add Product' : 'Edit Product'}</h3><button className="btn-ghost" onClick={() => setModal(null)}><X size={18} /></button></div>
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VIP Game Pass" />
              </div>
              <div className="form-group"><label className="form-label">Price ({cur}) *</label><input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="9.99" /></div>
              <div className="form-group"><label className="form-label">Compare Price ({cur})</label><input type="number" min="0" step="0.01" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} placeholder="14.99" /></div>
              <div className="form-group"><label className="form-label">Category</label><select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}><option value="">— None —</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Stock (-1 = unlimited)</label><input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Description</label><textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this product..." /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Main Image URL</label>
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                {form.image_url && <img src={form.image_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} onError={e => e.target.style.display = 'none'} />}
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Extra Images (one per line)</label><textarea rows={2} value={extraImgs} onChange={e => setExtraImgs(e.target.value)} placeholder="https://img1.com&#10;https://img2.com" /></div>
              <div className="form-group"><label className="form-label">Badge</label><select value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}><option value="">— None —</option><option value="NEW">NEW</option><option value="HOT">HOT</option><option value="SALE">SALE</option><option value="LIMITED">LIMITED</option><option value="EXCLUSIVE">EXCLUSIVE</option></select></div>
              <div className="form-group"><label className="form-label">Sort Order</label><input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Delivery Type</label><select value={form.delivery_type} onChange={e => setForm(f => ({ ...f, delivery_type: e.target.value }))}><option value="instant">Instant</option><option value="manual">Manual</option></select></div>
              <div className="form-group"><label className="form-label">Delivery Info</label><input value={form.delivery_info} onChange={e => setForm(f => ({ ...f, delivery_info: e.target.value }))} placeholder="Join game and use /vip" /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag + Enter" />
                  <button className="btn btn-secondary btn-sm" onClick={addTag} type="button" style={{ flexShrink: 0 }}>Add</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{form.tags.map(t => <span key={t} className="tag" style={{ cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}>{t} ×</span>)}</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} />Active</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} />Featured</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner spinner-sm" /> : modal === 'add' ? 'Create' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
