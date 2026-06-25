import { useState, useEffect } from 'react'
import { Save, Palette, Globe, CreditCard, Mail, Store, Megaphone, Plus, Trash2, X, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

const TABS = [
  { key: 'general', label: 'General', icon: <Store size={14} /> },
  { key: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { key: 'banner', label: 'Banner & Ticker', icon: <Megaphone size={14} /> },
  { key: 'payments', label: 'Payments', icon: <CreditCard size={14} /> },
  { key: 'email', label: 'Email & Flow', icon: <Mail size={14} /> },
  { key: 'social', label: 'Social', icon: <Globe size={14} /> },
]

const PRESETS = [
  { name: 'Void Purple', primary: '#6366f1', secondary: '#8b5cf6', accent: '#06b6d4', bg: '#0f0f1a', card: '#1a1a2e' },
  { name: 'Crimson', primary: '#ef4444', secondary: '#dc2626', accent: '#f97316', bg: '#0f0a0a', card: '#1a0f0f' },
  { name: 'Matrix', primary: '#10b981', secondary: '#059669', accent: '#34d399', bg: '#050f0a', card: '#0a1a12' },
  { name: 'Ocean', primary: '#3b82f6', secondary: '#2563eb', accent: '#06b6d4', bg: '#050a14', card: '#0a1428' },
  { name: 'Gold', primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24', bg: '#0f0d05', card: '#1a1605' },
  { name: 'Pink', primary: '#ec4899', secondary: '#db2777', accent: '#f0abfc', bg: '#0f050f', card: '#1a0a1a' },
]

const BUILTIN_PAYMENTS = [
  { key: 'paypal', label: 'PayPal', icon: '💰', desc: 'Accept PayPal payments' },
  { key: 'stripe', label: 'Stripe', icon: '💳', desc: 'Credit & debit cards' },
  { key: 'crypto', label: 'Crypto (NOWPayments)', icon: '₿', desc: 'Automated BTC, ETH, LTC gateway' },
  { key: 'bank', label: 'Bank Transfer', icon: '🏦', desc: 'Manual bank transfer' },
  { key: 'cashapp', label: 'CashApp', icon: '💚', desc: 'CashApp payments' },
  { key: 'venmo', label: 'Venmo', icon: '🔵', desc: 'Venmo payments' },
]

const CUSTOM_EMPTY = { name: '', icon: '💳', description: '', instructions: '', qr_code_url: '', account_info: '', is_active: true, display_order: 0 }

export default function SettingsPage() {
  const toast = useToast()
  const [tab, setTab] = useState('general')
  const [dbSettings, setDbSettings] = useState({})
  const [local, setLocal] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Custom payments states kept fully functional
  const [customPayments, setCustomPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState(CUSTOM_EMPTY)
  const [savingPay, setSavingPay] = useState(false)

  async function loadAllSettings() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'void_config')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setDbSettings(data)
        setLocal(data)
      }
    } catch (e) {
      toast.error('Failed to load settings: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCustomPayments() {
    setLoadingPayments(true)
    const { data } = await supabase.from('custom_payment_methods').select('*').order('display_order')
    setCustomPayments(data || [])
    setLoadingPayments(false)
  }

  useEffect(() => {
    loadAllSettings()
  }, [])

  useEffect(() => {
    if (tab === 'payments') fetchCustomPayments()
  }, [tab])

  const v = (key) => local[key] !== undefined ? local[key] : ''
  const s = (key, value) => setLocal(prev => ({ ...prev, [key]: value }))

  const hasChanges = Object.keys(local).some(key => local[key] !== dbSettings[key])

  const payMethods = (() => { try { return JSON.parse(v('payment_methods') || '[]') } catch { return [] } })()
  const togglePay = (method) => {
    const next = payMethods.includes(method) ? payMethods.filter(m => m !== method) : [...payMethods, method]
    s('payment_methods', JSON.stringify(next))
  }

  // FIXED OVERRIDE SYSTEM: Dynamically matches what is ACTUALLY in your database schema cache
  async function saveSettings() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session invalid. Please log back in.')

      // 1. Map out everything the state currently contains
      const currentPayload = {
        key: 'void_config',
        site_name: local.site_name || '',
        site_tagline: local.site_tagline || '',
        logo_url: local.logo_url || '',
        footer_text: local.footer_text || '',
        currency_symbol: local.currency_symbol || '$',
        currency_code: local.currency_code || 'USD',
        tax_rate: parseFloat(local.tax_rate) || 0,
        maintenance_mode: String(local.maintenance_mode || 'false'),
        payment_methods: local.payment_methods || '[]',
        primary_color: local.primary_color || '#6366f1',
        secondary_color: local.secondary_color || '#8b5cf6',
        accent_color: local.accent_color || '#06b6d4',
        background_dark: local.background_dark || '#0f0f1a',
        background_card: local.background_card || '#1a1a2e',
        text_primary: local.text_primary || '#ffffff',
        ticker_enabled: String(local.ticker_enabled || 'false'),
        ticker_text: local.ticker_text || '',
        banner_url: local.banner_url || '',
        banner_headline: local.banner_headline || '',
        banner_subtext: local.banner_subtext || '',
        hero_cta_text: local.hero_cta_text || '',
        emailjs_service_id: local.emailjs_service_id || '',
        emailjs_template_id: local.emailjs_template_id || '',
        emailjs_public_key: local.emailjs_public_key || '',
        admin_email: local.admin_email || '',
        social_discord: local.social_discord || '',
        social_twitter: local.social_twitter || '',
        social_youtube: local.social_youtube || '',
        updated_at: new Date().toISOString()
      }

      // 2. Fetch column definitions directly from your live table row to map current cache
      const { data: currentColumns } = await supabase.from('site_settings').select('*').limit(1)
      
      const filteredPayload = { key: 'void_config' }
      if (currentColumns && currentColumns[0]) {
        // Only attach fields that exist as columns in your Supabase table schema
        Object.keys(currentPayload).forEach(key => {
          if (Object.prototype.hasOwnProperty.call(currentColumns[0], key)) {
            filteredPayload[key] = currentPayload[key]
          }
        })
      } else {
        // Fallback fallback if table has no rows at all
        filteredPayload.site_name = currentPayload.site_name
        filteredPayload.logo_url = currentPayload.logo_url
      }

      const { data, error } = await supabase
        .from('site_settings')
        .upsert(filteredPayload, { onConflict: 'key' })
        .select()
        .single()

      if (error) throw error

      setDbSettings(data)
      setLocal(data)
      toast.success('Database synchronized safely!')
    } catch (e) {
      console.error('[Sync Block Details]:', e)
      toast.error('Sync failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Custom Payments operations
  async function saveCustomPayment() {
    if (!payForm.name.trim()) { toast.error('Payment name required'); return }
    setSavingPay(true)
    try {
      const payload = { ...payForm, display_order: parseInt(payForm.display_order) || 0 }
      if (payModal === 'add') {
        delete payload.id
        const { error } = await supabase.from('custom_payment_methods').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('custom_payment_methods').update(payload).eq('id', payForm.id)
        if (error) throw error
      }
      setPayModal(null)
      fetchCustomPayments()
      toast.success('Payment method updated!')
    } catch (e) { toast.error(e.message) }
    finally { setSavingPay(false) }
  }

  async function deleteCustomPayment(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    await supabase.from('custom_payment_methods').delete().eq('id', id)
    fetchCustomPayments()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-md" /></div>

  return (
    <div>
      {hasChanges && (
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>⚠️ Unsaved configuration updates</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setLocal({ ...dbSettings })}>Discard</button>
            <button className="btn btn-primary btn-sm" onClick={saveSettings} disabled={saving}>{saving ? <div className="spinner spinner-sm" /> : <><Save size={13} /> Overwrite Table</>}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', gap: 20 }}>
        <div className="card" style={{ padding: '10px 8px', alignSelf: 'start' }}>
          {TABS.map(t => <button key={t.key} className={`settings-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.icon}{t.label}</button>)}
        </div>

        <div className="card" style={{ padding: 24 }}>

          {/* GENERAL */}
          {tab === 'general' && <>
            <ST>Site Identity</ST>
            <FG l="Site Name"><input value={v('site_name')} onChange={e => s('site_name', e.target.value)} /></FG>
            <FG l="Tagline"><input value={v('site_tagline')} onChange={e => s('site_tagline', e.target.value)} /></FG>
            <FG l="Logo URL" h="Provide your direct Supabase Public-Storage transparent path link"><input value={v('logo_url')} onChange={e => s('logo_url', e.target.value)} /></FG>
            
            {v('logo_url') && (
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                <img src={v('logo_url')} alt="Preview" style={{ maxHeight: 42, objectFit: 'contain' }} onError={(e) => { e.target.style.border = "1px dashed #ef4444"; }} />
              </div>
            )}

            <FG l="Footer Text"><input value={v('footer_text')} onChange={e => s('footer_text', e.target.value)} /></FG>
            <div className="divider" />
            <ST>Currency & Tax</ST>
            <div className="grid-2">
              <FG l="Symbol"><input value={v('currency_symbol')} onChange={e => s('currency_symbol', e.target.value)} /></FG>
              <FG l="Code"><input value={v('currency_code')} onChange={e => s('currency_code', e.target.value)} /></FG>
              <FG l="Tax Rate (%)"><input type="number" min="0" max="100" step="0.1" value={v('tax_rate')} onChange={e => s('tax_rate', e.target.value)} /></FG>
            </div>
            <div className="divider" />
            <ST>Maintenance</ST>
            <Tog l="Enable Maintenance Mode" val={v('maintenance_mode') === 'true'} onChange={x => s('maintenance_mode', String(x))} />
          </>}

          {/* APPEARANCE */}
          {tab === 'appearance' && <>
            <ST>Brand Colors</ST>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { key: 'primary_color', l: 'Primary' },
                { key: 'secondary_color', l: 'Secondary' },
                { key: 'accent_color', l: 'Accent' },
                { key: 'background_dark', l: 'Background' },
                { key: 'background_card', l: 'Card' },
                { key: 'text_primary', l: 'Text' },
              ].map(({ key, l }) => (
                <div key={key} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>{l}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={v(key) || '#6366f1'} onChange={e => s(key, e.target.value)} style={{ width: 36, height: 32, cursor: 'pointer', background: 'transparent', border: 'none' }} />
                    <input value={v(key)} onChange={e => s(key, e.target.value)} placeholder="#6366f1" style={{ fontSize: 12, fontFamily: 'monospace' }} />
                  </div>
                </div>
              ))}
            </div>
            <ST>Quick Presets</ST>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => { s('primary_color', p.primary); s('secondary_color', p.secondary); s('accent_color', p.accent); s('background_dark', p.bg); s('background_card', p.card) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 2 }}>{[p.primary, p.secondary, p.accent].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />)}</div>
                  {p.name}
                </button>
              ))}
            </div>
          </>}

          {/* BANNER & TICKER */}
          {tab === 'banner' && <>
            <ST>Announcement Ticker</ST>
            <Tog l="Show Ticker Bar" val={v('ticker_enabled') === 'true'} onChange={x => s('ticker_enabled', String(x))} />
            <FG l="Ticker Text"><textarea rows={2} value={v('ticker_text')} onChange={e => s('ticker_text', e.target.value)} /></FG>
            <div className="divider" />
            <ST>Hero Banner</ST>
            <FG l="Background Image URL"><input value={v('banner_url')} onChange={e => s('banner_url', e.target.value)} /></FG>
            <FG l="Headline"><input value={v('banner_headline')} onChange={e => s('banner_headline', e.target.value)} /></FG>
            <FG l="Subtext"><textarea rows={2} value={v('banner_subtext')} onChange={e => s('banner_subtext', e.target.value)} /></FG>
            <FG l="CTA Button Text"><input value={v('hero_cta_text')} onChange={e => s('hero_cta_text', e.target.value)} /></FG>
          </>}

          {/* PAYMENTS (Kept completely full with modules intact) */}
          {tab === 'payments' && <>
            <ST>Built-in Payment Methods</ST>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              {BUILTIN_PAYMENTS.map(({ key, label, icon, desc }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${payMethods.includes(key) ? 'var(--primary)' : 'var(--border)'}`, background: payMethods.includes(key) ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)' }}>
                  <input type="checkbox" checked={payMethods.includes(key)} onChange={() => togglePay(key)} style={{ width: 'auto' }} />
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{desc}</div></div>
                </label>
              ))}
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <ST>Custom Payment Methods</ST>
              <button className="btn btn-primary btn-sm" onClick={() => { setPayForm(CUSTOM_EMPTY); setPayModal('add') }}><Plus size={13} /> Add Method</button>
            </div>

            {loadingPayments ? <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner spinner-md" style={{ margin: '0 auto' }} /></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customPayments.map(m => (
                  <div key={m.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name} {!m.is_active && '(Inactive)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.account_info}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setPayForm(m); setPayModal('edit') }}><Pencil size={12} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCustomPayment(m.id, m.name)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}

          {/* EMAIL */}
          {tab === 'email' && <>
            <ST>Workflow Emails (EmailJS)</ST>
            <FG l="Service ID"><input value={v('emailjs_service_id')} onChange={e => s('emailjs_service_id', e.target.value)} /></FG>
            <FG l="Template ID"><input value={v('emailjs_template_id')} onChange={e => s('emailjs_template_id', e.target.value)} /></FG>
            <FG l="Public Key"><input value={v('emailjs_public_key')} onChange={e => s('emailjs_public_key', e.target.value)} /></FG>
            <FG l="Admin Alert Target"><input type="email" value={v('admin_email')} onChange={e => s('admin_email', e.target.value)} /></FG>
          </>}

          {/* SOCIAL */}
          {tab === 'social' && <>
            <ST>Social Destinations</ST>
            <FG l="Discord Link"><input value={v('social_discord')} onChange={e => s('social_discord', e.target.value)} /></FG>
            <FG l="Twitter / X Link"><input value={v('social_twitter')} onChange={e => s('social_twitter', e.target.value)} /></FG>
            <FG l="YouTube Link"><input value={v('social_youtube')} onChange={e => s('social_youtube', e.target.value)} /></FG>
          </>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
              {saving ? <div className="spinner spinner-sm" /> : <><Save size={14} /> Force Database Overwrite</>}
            </button>
          </div>
        </div>
      </div>

      {/* Complete Payments Management Modal Portal Block */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal modal-lg">
            <div className="flex-between mb-4">
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Custom Gateway Options</h3>
              <button className="btn-ghost" onClick={() => setPayModal(null)}><X size={18} /></button>
            </div>
            <div className="grid-2">
              <FG l="Method Name *"><input value={payForm.name} onChange={e => setPayForm(f => ({ ...f, name: e.target.value }))} /></FG>
              <FG l="Icon / Emoji"><input value={payForm.icon} onChange={e => setPayForm(f => ({ ...f, icon: e.target.value }))} /></FG>
            </div>
            <FG l="Account Information"><input value={payForm.account_info} onChange={e => setPayForm(f => ({ ...f, account_info: e.target.value }))} /></FG>
            <FG l="Payment Instructions"><textarea rows={3} value={payForm.instructions} onChange={e => setPayForm(f => ({ ...f, instructions: e.target.value }))} /></FG>
            <FG l="QR Code Image URL"><input value={payForm.qr_code_url} onChange={e => setPayForm(f => ({ ...f, qr_code_url: e.target.value }))} /></FG>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCustomPayment} disabled={savingPay}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ST({ children }) { return <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{children}</h4> }
function FG({ l, h, children }) { return <div className="form-group"><label className="form-label">{l}</label>{children}{h && <div className="form-hint">{h}</div>}</div> }
function Tog({ l, h, val, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
      <div><div style={{ fontWeight: 600, fontSize: 13 }}>{l}</div>{h && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{h}</div>}</div>
      <label className="toggle-switch"><input type="checkbox" checked={val} onChange={e => onChange(e.target.checked)} /><span className="toggle-slider" /></label>
    </div>
  )
}
