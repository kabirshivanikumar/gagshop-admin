import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Star, Eye, EyeOff, X, Copy, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../components/ui/Toast'

const EMPTY = {
  name: '', description: '', price: '', compare_price: '', image_url: '',
  images: [], category_id: '', stock: -1, is_active: true, is_featured: false,
  badge: '', delivery_type: 'instant', delivery_info: '', tags: [], sort_order: 0
}

// Only send known DB columns — avoids schema cache errors
function toPayload(form, extraImgs) {
  return {
    name: form.name,
    description: form.description || null,
    price: parseFloat(form.price),
    compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
    image_url: form.image_url || null,
    images: extraImgs.split('\n').map(s => s.trim()).filter(Boolean),
    category_id: form.category_id || null,
    stock: parseInt(form.stock) || -1,
    is_active: form.is_active,
    is_featured: form.is_featured,
    badge: form.badge || null,
    delivery_type: form.delivery_type || 'instant',
    delivery_info: form.delivery_info || null,
    tags: form.tags || [],
    sort_order: parseInt(form.sort_order) || 0,
    updated_at: new Date().toISOString(),
  }
}

export default function Products() {
  const { get } = useSettings()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
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
  function openEdit(p) {
    setForm({ ...p, price: String(p.price), compare_price: String(p.compare_price || ''), tags: p.tags || [] })
    setTagInput('')
    setExtraImgs((p.images || []).join('\n'))
    setModal('edit')
  }
  function openDuplicate(p) {
    setForm({ ...p, id: undefined, name: p.name + ' (Copy)', price: String(p.price), compare_price: String(p.compare_price || ''), tags: p.tags || [] })
    setTagInput('')
    setExtraImgs((p.images || []).join('\n'))
    setModal('add')
    toast.info('Duplicated — edit and save as new product')
  }

  async function save() {
    if (!form.name?.trim()) { toast.error('Product name is required'); return }
    if (!form.price || isNaN(parseFloat(form.price))) { toast.error('Valid price is required'); return }
    setSaving(true)
    try {
      const payload = toPayload(form, extraImgs)
      if (modal === 'add') {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        toast.success('Product created!')
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', form.id)
        if (error) throw error
        toast.success('Product updated!')
      }
      setModal(null)
      fetchAll()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function del(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Product deleted')
    fetchAll()
  }

  async function toggleActive(id, v) {
    await supabase.from('products').update({ is_active: v, updated_at: new Date().toISOString() }).eq('id', id)
    setProducts(ps => ps.map(p => p.id === id ? { ...p, is_active: v } : p))
    toast.success(v ? 'Product visible' : 'Product hidden')
  }

  async function toggleFeatured(id, v) {
    await supabase.from('products').update({ is_featured: v, updated_at: new Date().toISOString() }).eq('id', id)
    setProducts(ps => ps.map(p => p.id === id ? { ...p, is_featured: v } : p))
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }

  // Filtering
  let filtered = products
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase()))
  if (filterCat) filtered = filtered.filter(p => p.category_id === filterCat)
  if (filterStatus === 'active') filtered = filtered.filter(p => p.is_active)
  if (filterStatus === 'hidden') filtered = filtered.filter(p => !p.is_active)
  if (filterStatus === 'featured') filtered = filtered.filter(p => p.is_featured)
  if (filterStatus === 'low_stock') filtered = filtered.filter(p => p.stock >= 0 && p.stock < 5)

  const activeCount = products.filter(p => p.is_active).length
  const featuredCount = products.filter(p => p.is_featured).length

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: products.length, color: 'var(--text)' },
          { label: 'Active', value: activeCount, color: 'var(--success)' },
          { label: 'Hidden', value: products.length - activeCount, color: 'var(--muted)' },
          { label: 'Featured', value: featuredCount, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: 130 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
          <option value="featured">Featured</option>
          <option value="low_stock">Low Stock (&lt;5)</option>
        </select>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Product</button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Package size={40} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--muted)' }}>{products.length === 0 ? 'No products yet — add your first one!' : 'No products match your filters'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>Price</th><th>Stock</th>
                  <th>Active</th><th>Featured</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(99,102,241,0.1)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} /> : <span>🎮</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                            {p.badge && <span className={`badge badge-${p.badge.toLowerCase()==='new'?'green':p.badge.toLowerCase()==='hot'?'red':p.badge.toLowerCase()==='sale'?'yellow':'blue'}`}>{p.badge}</span>}
                            {p.stock >= 0 && p.stock < 5 && <span className="badge badge-yellow">Low Stock</span>}
                            {p.stock === 0 && <span className="badge badge-red">Out of Stock</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.category_name || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{cur}{Number(p.price).toFixed(2)}</div>
                      {p.compare_price > p.price && <div style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--muted)' }}>{cur}{Number(p.compare_price).toFixed(2)}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 600, color: p.stock === 0 ? 'var(--danger)' : p.stock > 0 && p.stock < 5 ? 'var(--warning)' : 'var(--text)' }}>
                        {p.stock === -1 ? '∞' : p.stock}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => toggleActive(p.id, !p.is_active)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.is_active ? 'var(--success)' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {p.is_active ? <Eye size={13} /> : <EyeOff size={13} />} {p.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => toggleFeatured(p.id, !p.is_featured)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_featured ? 'var(--warning)' : 'var(--muted)', padding: 4 }}>
                        <Star size={15} fill={p.is_featured ? 'var(--warning)' : 'none'} />
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" title="Duplicate" onClick={() => openDuplicate(p)}><Copy size={12} /></button>
                        <button className="btn btn-secondary btn-sm" title="Edit" onClick={() => openEdit(p)}><Pencil size={12} /></button>
                        <button className="btn btn-danger btn-sm" title="Delete" onClick={() => del(p.id, p.name)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
        Showing {filtered.length} of {products.length} products
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="flex-between mb-4">
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>{modal === 'add' ? 'Add Product' : `Edit: ${form.name}`}</h3>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            {/* Tabs inside modal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Left column */}
              <div>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. VIP Game Pass" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this include?" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Price ({cur}) *</label>
                    <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="9.99" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Compare Price</label>
                    <input type="number" min="0" step="0.01" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} placeholder="14.99" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">— None —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock (-1 = ∞)</label>
                    <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} /> Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} /> Featured
                  </label>
                </div>
              </div>

              {/* Right column */}
              <div>
                <div className="form-group">
                  <label className="form-label">Main Image URL</label>
                  <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                  {form.image_url && (
                    <img src={form.image_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} onError={e => e.target.style.display='none'} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Extra Images (one URL per line)</label>
                  <textarea rows={2} value={extraImgs} onChange={e => setExtraImgs(e.target.value)} placeholder="https://img1.com&#10;https://img2.com" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Badge</label>
                    <select value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}>
                      <option value="">— None —</option>
                      <option value="NEW">NEW</option>
                      <option value="HOT">HOT</option>
                      <option value="SALE">SALE</option>
                      <option value="LIMITED">LIMITED</option>
                      <option value="EXCLUSIVE">EXCLUSIVE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sort Order</label>
                    <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery</label>
                    <select value={form.delivery_type} onChange={e => setForm(f => ({ ...f, delivery_type: e.target.value }))}>
                      <option value="instant">Instant</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Info</label>
                    <input value={form.delivery_info} onChange={e => setForm(f => ({ ...f, delivery_info: e.target.value }))} placeholder="e.g. use /vip in game" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Type tag + Enter" />
                    <button className="btn btn-secondary btn-sm" onClick={addTag} type="button" style={{ flexShrink: 0 }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {(form.tags || []).map(t => (
                      <span key={t} className="tag" style={{ cursor: 'pointer', gap: 5 }} onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}>
                        {t} <X size={10} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <div className="spinner spinner-sm" /> : modal === 'add' ? 'Create Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
