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
  { name: 'Crimson',     primary: '#ef4444', secondary: '#dc2626', accent: '#f97316', bg: '#0f0a0a', card: '#1a0f0f' },
  { name: 'Matrix',      primary: '#10b981', secondary: '#059669', accent: '#34d399', bg: '#050f0a', card: '#0a1a12' },
  { name: 'Ocean',       primary: '#3b82f6', secondary: '#2563eb', accent: '#06b6d4', bg: '#050a14', card: '#0a1428' },
  { name: 'Gold',        primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24', bg: '#0f0d05', card: '#1a1605' },
  { name: 'Pink',        primary: '#ec4899', secondary: '#db2777', accent: '#f0abfc', bg: '#0f050f', card: '#1a0a1a' },
]

const BUILTIN_PAYMENTS = [
  { key: 'paypal',   label: 'PayPal',                  icon: '💰', desc: 'Accept PayPal payments' },
  { key: 'stripe',   label: 'Stripe',                  icon: '💳', desc: 'Credit & debit cards' },
  { key: 'crypto',   label: 'Crypto (NOWPayments)',    icon: '₿',  desc: 'Automated BTC, ETH, LTC gateway' },
  { key: 'bank',     label: 'Bank Transfer',           icon: '🏦', desc: 'Manual bank transfer' },
  { key: 'cashapp',  label: 'CashApp',                 icon: '💚', desc: 'CashApp payments' },
  { key: 'venmo',    label: 'Venmo',                   icon: '🔵', desc: 'Venmo payments' },
]

const CUSTOM_EMPTY = {
  name: '', icon: '💳', description: '',
  instructions: '', qr_code_url: '', account_info: '',
  is_active: true, display_order: 0,
}

// All setting keys that live as individual rows in site_settings
const ALL_KEYS = [
  'site_name','site_tagline','logo_url','footer_text',
  'currency_symbol','currency_code','tax_rate','maintenance_mode',
  'payment_methods','nowpayments_api_key',
  'primary_color','secondary_color','accent_color','background_dark','background_card','text_primary',
  'ticker_enabled','ticker_text',
  'banner_url','banner_headline','banner_subtext','hero_cta_text',
  'emailjs_service_id','emailjs_template_id','emailjs_public_key','admin_email',
  'social_discord','social_twitter','social_youtube',
]

export default function SettingsPage() {
  const toast = useToast()
  const [tab, setTab]           = useState('general')
  // `saved` = what's in DB right now. `local` = in-flight edits.
  const [saved, setSaved]       = useState({})
  const [local, setLocal]       = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const [customPayments, setCustomPayments]   = useState([])
  const [loadingPay, setLoadingPay]           = useState(false)
  const [payModal, setPayModal]               = useState(null)
  const [payForm, setPayForm]                 = useState(CUSTOM_EMPTY)
  const [savingPay, setSavingPay]             = useState(false)

  // ── Load all settings from DB on mount ──────────────────────────
  useEffect(() => { fetchSettings() }, [])
  useEffect(() => { if (tab === 'payments') fetchCustomPayments() }, [tab])

  async function fetchSettings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
      if (error) throw error
      const map = {}
      ;(data || []).forEach(row => { map[row.key] = row.value })
      setSaved(map)
      setLocal(map)
    } catch (e) {
      toast.error('Failed to load settings: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCustomPayments() {
    setLoadingPay(true)
    const { data } = await supabase
      .from('custom_payment_methods')
      .select('*')
      .order('display_order')
    setCustomPayments(data || [])
    setLoadingPay(false)
  }

  // ── Helpers ─────────────────────────────────────────────────────
  // Get current value (local edit wins over saved)
  const v = (key) => local[key] !== undefined ? local[key] : (saved[key] ?? '')
  // Set a local edit
  const s = (key, value) => setLocal(prev => ({ ...prev, [key]: value }))

  const hasChanges = ALL_KEYS.some(key => local[key] !== saved[key])

  const payMethods = (() => {
    try { return JSON.parse(v('payment_methods') || '[]') } catch { return [] }
  })()
  const togglePay = (method) => {
    const next = payMethods.includes(method)
      ? payMethods.filter(m => m !== method)
      : [...payMethods, method]
    s('payment_methods', JSON.stringify(next))
  }

  // ── Save: upsert each changed key as its own row ─────────────────
  async function saveSettings() {
    setSaving(true)
    try {
      // Build list of keys that changed
      const changedKeys = ALL_KEYS.filter(key => local[key] !== saved[key])
      if (changedKeys.length === 0) { toast.info('No changes to save'); setSaving(false); return }

      // Upsert each changed key individually — matches the per-row schema
      const upserts = changedKeys.map(key => ({
        key,
        value: local[key] !== undefined ? String(local[key]) : '',
      }))

      const { error } = await supabase
        .from('site_settings')
        .upsert(upserts, { onConflict: 'key' })

      if (error) throw error

      // Persist to saved state
      const nextSaved = { ...saved }
      changedKeys.forEach(key => { nextSaved[key] = local[key] })
      setSaved(nextSaved)
      setLocal(nextSaved)

      toast.success(`Saved ${changedKeys.length} setting${changedKeys.length > 1 ? 's' : ''}!`)
    } catch (e) {
      console.error(e)
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Custom payment methods CRUD ──────────────────────────────────
  async function saveCustomPayment() {
    if (!payForm.name.trim()) { toast.error('Payment name required'); return }
    setSavingPay(true)
    try {
      const payload = { ...payForm, display_order: parseInt(payForm.display_order) || 0 }
      if (payModal === 'add') {
        delete payload.id
        const { error } = await supabase.from('custom_payment_methods').insert(payload)
        if (error) throw error
        toast.success('Payment method added!')
      } else {
        const { error } = await supabase.from('custom_payment_methods').update(payload).eq('id', payForm.id)
        if (error) throw error
        toast.success('Payment method updated!')
      }
      setPayModal(null)
      fetchCustomPayments()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingPay(false)
    }
  }

  async function deleteCustomPayment(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    await supabase.from('custom_payment_methods').delete().eq('id', id)
    toast.success('Deleted')
    fetchCustomPayments()
  }

  async function toggleCustomActive(id, val) {
    await supabase.from('custom_payment_methods').update({ is_active: val }).eq('id', id)
    setCustomPayments(cs => cs.map(c => c.id === id ? { ...c, is_active: val } : c))
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  return (
    <div>
      {/* Unsaved changes bar */}
      {hasChanges && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: 10, padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18, backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>⚠️ You have unsaved changes</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setLocal({ ...saved })}>Discard</button>
            <button className="btn btn-primary btn-sm" onClick={saveSettings} disabled={saving}>
              {saving ? <div className="spinner spinner-sm" /> : <><Save size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', gap: 20 }}>
        {/* Sidebar */}
        <div className="card" style={{ padding: '10px 8px', alignSelf: 'start' }}>
          {TABS.map(t => (
            <button key={t.key} className={`settings-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="card" style={{ padding: 24 }}>

          {/* ── GENERAL ── */}
          {tab === 'general' && <>
            <ST>Site Identity</ST>
            <FG l="Site Name"><input value={v('site_name')} onChange={e => s('site_name', e.target.value)} placeholder="VoidEnterprises" /></FG>
            <FG l="Tagline"><input value={v('site_tagline')} onChange={e => s('site_tagline', e.target.value)} placeholder="Premium Roblox Items" /></FG>
            <FG l="Logo URL" h="Direct image URL — leave blank for text logo">
              <input value={v('logo_url')} onChange={e => s('logo_url', e.target.value)} placeholder="https://..." />
            </FG>
            {v('logo_url') && (
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                <img src={v('logo_url')} alt="Logo preview" style={{ maxHeight: 42, objectFit: 'contain' }} onError={e => e.target.style.opacity = '0.2'} />
              </div>
            )}
            <FG l="Footer Text"><input value={v('footer_text')} onChange={e => s('footer_text', e.target.value)} placeholder="© 2025 VoidEnterprises" /></FG>
            <div className="divider" />
            <ST>Currency & Tax</ST>
            <div className="grid-2">
              <FG l="Symbol"><input value={v('currency_symbol')} onChange={e => s('currency_symbol', e.target.value)} placeholder="$" /></FG>
              <FG l="Code"><input value={v('currency_code')} onChange={e => s('currency_code', e.target.value)} placeholder="USD" /></FG>
              <FG l="Tax Rate (%)"><input type="number" min="0" max="100" step="0.1" value={v('tax_rate')} onChange={e => s('tax_rate', e.target.value)} placeholder="0" /></FG>
            </div>
            <div className="divider" />
            <ST>Maintenance</ST>
            <Tog l="Enable Maintenance Mode" h="Hides the shop from customers" val={v('maintenance_mode') === 'true'} onChange={x => s('maintenance_mode', String(x))} />
          </>}

          {/* ── APPEARANCE ── */}
          {tab === 'appearance' && <>
            <ST>Brand Colors</ST>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>Changes apply instantly across the storefront once saved</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { key: 'primary_color',    l: 'Primary',    h: 'Buttons & links' },
                { key: 'secondary_color',  l: 'Secondary',  h: 'Gradients' },
                { key: 'accent_color',     l: 'Accent',     h: 'Highlights' },
                { key: 'background_dark',  l: 'Background', h: 'Page background' },
                { key: 'background_card',  l: 'Card',       h: 'Card background' },
                { key: 'text_primary',     l: 'Text',       h: 'Main text colour' },
              ].map(({ key, l, h }) => (
                <div key={key} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{l}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={v(key) || '#6366f1'} onChange={e => s(key, e.target.value)}
                      style={{ width: 36, height: 32, padding: 2, borderRadius: 7, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', flexShrink: 0 }} />
                    <input value={v(key)} onChange={e => s(key, e.target.value)} placeholder="#6366f1" style={{ fontSize: 12, fontFamily: 'monospace' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{h}</div>
                </div>
              ))}
            </div>
            <ST>Quick Presets</ST>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button key={p.name}
                  onClick={() => {
                    s('primary_color', p.primary); s('secondary_color', p.secondary)
                    s('accent_color', p.accent); s('background_dark', p.bg); s('background_card', p.card)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', fontFamily: 'inherit', fontSize: 12, color: 'var(--text)' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[p.primary, p.secondary, p.accent].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
                  </div>
                  {p.name}
                </button>
              ))}
            </div>
          </>}

          {/* ── BANNER & TICKER ── */}
          {tab === 'banner' && <>
            <ST>Announcement Ticker</ST>
            <Tog l="Show Ticker Bar" h="Scrolling bar at top of storefront" val={v('ticker_enabled') === 'true'} onChange={x => s('ticker_enabled', String(x))} />
            <FG l="Ticker Text" h="Use · to separate messages">
              <textarea rows={2} value={v('ticker_text')} onChange={e => s('ticker_text', e.target.value)} placeholder="🎮 New items weekly · 🔥 Flash sales daily" />
            </FG>
            <div className="divider" />
            <ST>Hero Banner</ST>
            <FG l="Background Image URL" h="Leave blank for animated gradient">
              <input value={v('banner_url')} onChange={e => s('banner_url', e.target.value)} placeholder="https://..." />
            </FG>
            <FG l="Headline"><input value={v('banner_headline')} onChange={e => s('banner_headline', e.target.value)} placeholder="The #1 Roblox Shop" /></FG>
            <FG l="Subtext"><textarea rows={2} value={v('banner_subtext')} onChange={e => s('banner_subtext', e.target.value)} /></FG>
            <FG l="CTA Button Text"><input value={v('hero_cta_text')} onChange={e => s('hero_cta_text', e.target.value)} placeholder="Shop Now" /></FG>
          </>}

          {/* ── PAYMENTS ── */}
          {tab === 'payments' && <>
            <ST>Built-in Payment Methods</ST>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Toggle which methods appear at checkout</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              {BUILTIN_PAYMENTS.map(({ key, label, icon, desc }) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${payMethods.includes(key) ? 'var(--primary)' : 'var(--border)'}`,
                  background: payMethods.includes(key) ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                  transition: 'var(--t)'
                }}>
                  <input type="checkbox" checked={payMethods.includes(key)} onChange={() => togglePay(key)} style={{ width: 'auto', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* NOWPayments API key (only shown when crypto is enabled) */}
            {payMethods.includes('crypto') && (
              <div style={{ marginBottom: 24 }}>
                <FG l="NOWPayments API Key" h="Get your key at nowpayments.io → API keys">
                  <input value={v('nowpayments_api_key')} onChange={e => s('nowpayments_api_key', e.target.value)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" />
                </FG>
              </div>
            )}

            <div className="divider" />

            {/* Custom payment methods */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <ST>Custom Payment Methods</ST>
              <button className="btn btn-primary btn-sm" onClick={() => { setPayForm(CUSTOM_EMPTY); setPayModal('add') }}>
                <Plus size={13} /> Add Method
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Add PayLah, GCash, bank QR codes, etc.</p>

            {loadingPay ? (
              <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner spinner-md" style={{ margin: '0 auto' }} /></div>
            ) : customPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No custom methods yet — add PayLah, GCash, bank QR and more</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customPayments.map(m => (
                  <div key={m.id} style={{
                    padding: '14px 16px', borderRadius: 12,
                    border: `2px solid ${m.is_active ? 'var(--primary)' : 'var(--border)'}`,
                    background: m.is_active ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
                    display: 'flex', alignItems: 'center', gap: 14
                  }}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {m.name}
                        {!m.is_active && <span className="badge badge-gray">Off</span>}
                        {m.qr_code_url && <span className="badge badge-blue">QR</span>}
                      </div>
                      {m.account_info && <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 2 }}>{m.account_info}</div>}
                      {m.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.description}</div>}
                    </div>
                    {m.qr_code_url && (
                      <img src={m.qr_code_url} alt="QR" style={{ width: 44, height: 44, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 2 }} onError={e => e.target.style.display='none'} />
                    )}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleCustomActive(m.id, !m.is_active)}>
                        {m.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setPayForm(m); setPayModal('edit') }}><Pencil size={12} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCustomPayment(m.id, m.name)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="divider" />
            <ST>PayPal</ST>
            <FG l="PayPal Email" h="Your receiving PayPal email">
              <input type="email" value={v('paypal_email')} onChange={e => s('paypal_email', e.target.value)} placeholder="payments@voidenterprises.xyz" />
            </FG>
            <ST>Stripe</ST>
            <FG l="Stripe Public Key">
              <input value={v('stripe_public_key')} onChange={e => s('stripe_public_key', e.target.value)} placeholder="pk_live_..." />
            </FG>
          </>}

          {/* ── EMAIL ── */}
          {tab === 'email' && <>
            <ST>Order Confirmation Emails (EmailJS)</ST>
            <div style={{ padding: 14, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 10, marginBottom: 18, fontSize: 12, lineHeight: 1.7 }}>
              1. Sign up at <a href="https://emailjs.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>emailjs.com</a> → connect your email service<br />
              2. Create a template using: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>{'{{to_name}}'}</code> <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>{'{{order_number}}'}</code> <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>{'{{total}}'}</code><br />
              3. Paste your IDs below and save
            </div>
            <FG l="Service ID"><input value={v('emailjs_service_id')} onChange={e => s('emailjs_service_id', e.target.value)} placeholder="service_xxxxxxx" /></FG>
            <FG l="Template ID"><input value={v('emailjs_template_id')} onChange={e => s('emailjs_template_id', e.target.value)} placeholder="template_xxxxxxx" /></FG>
            <FG l="Public Key"><input value={v('emailjs_public_key')} onChange={e => s('emailjs_public_key', e.target.value)} placeholder="xxxxxxxxxxxxxx" /></FG>
            <div className="divider" />
            <FG l="Admin Notification Email" h="You'll get a copy of every order">
              <input type="email" value={v('admin_email')} onChange={e => s('admin_email', e.target.value)} placeholder="admin@voidenterprises.xyz" />
            </FG>
          </>}

          {/* ── SOCIAL ── */}
          {tab === 'social' && <>
            <ST>Social Links</ST>
            <FG l="Discord Server URL"><input value={v('social_discord')} onChange={e => s('social_discord', e.target.value)} placeholder="https://discord.gg/..." /></FG>
            <FG l="Twitter / X URL"><input value={v('social_twitter')} onChange={e => s('social_twitter', e.target.value)} placeholder="https://twitter.com/..." /></FG>
            <FG l="YouTube URL"><input value={v('social_youtube')} onChange={e => s('social_youtube', e.target.value)} placeholder="https://youtube.com/..." /></FG>
          </>}

          {/* Bottom save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-primary" onClick={saveSettings} disabled={saving || !hasChanges}>
              {saving
                ? <div className="spinner spinner-sm" />
                : <><Save size={14} /> {hasChanges ? 'Save Changes' : 'All Saved'}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Custom Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal modal-lg">
            <div className="flex-between mb-4">
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>
                {payModal === 'add' ? 'Add Custom Payment Method' : `Edit: ${payForm.name}`}
              </h3>
              <button className="btn-ghost" onClick={() => setPayModal(null)}><X size={18} /></button>
            </div>

            <div className="grid-2">
              <FG l="Method Name *">
                <input value={payForm.name} onChange={e => setPayForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PayLah, GCash, PayNow" autoFocus />
              </FG>
              <FG l="Icon / Emoji">
                <input value={payForm.icon} onChange={e => setPayForm(f => ({ ...f, icon: e.target.value }))} placeholder="💳" style={{ fontSize: 20 }} />
              </FG>
              <FG l="Short Description">
                <input value={payForm.description} onChange={e => setPayForm(f => ({ ...f, description: e.target.value }))} placeholder="Pay via PayLah wallet" />
              </FG>
              <FG l="Account / Phone / ID">
                <input value={payForm.account_info} onChange={e => setPayForm(f => ({ ...f, account_info: e.target.value }))} placeholder="+65 9123 4567 or @handle" />
              </FG>
            </div>

            <FG l="Payment Instructions" h="Shown to customer after placing order — use {total} and {order} as placeholders">
              <textarea rows={3} value={payForm.instructions}
                onChange={e => setPayForm(f => ({ ...f, instructions: e.target.value }))}
                placeholder="Open PayLah → scan QR or send {total} to +65 9123 4567 → include {order} as reference." />
            </FG>

            <FG l="QR Code Image URL" h="Upload to imgbb.com (free) and paste the direct link here">
              <input value={payForm.qr_code_url} onChange={e => setPayForm(f => ({ ...f, qr_code_url: e.target.value }))} placeholder="https://i.ibb.co/..." />
            </FG>

            {payForm.qr_code_url && (
              <div style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <img src={payForm.qr_code_url} alt="QR Preview"
                  style={{ width: 110, height: 110, objectFit: 'contain', background: '#fff', padding: 8, borderRadius: 10, border: '1px solid var(--border)' }}
                  onError={e => e.target.style.display='none'} />
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4 }}>
                  ✅ QR preview — customers will see this on the order confirmation page to scan and pay.
                </div>
              </div>
            )}

            <div className="grid-2">
              <FG l="Display Order">
                <input type="number" value={payForm.display_order} onChange={e => setPayForm(f => ({ ...f, display_order: e.target.value }))} placeholder="0" />
              </FG>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={payForm.is_active} onChange={e => setPayForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} />
                  Active (show at checkout)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCustomPayment} disabled={savingPay}>
                {savingPay ? <div className="spinner spinner-sm" /> : payModal === 'add' ? 'Add Method' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ST({ children }) {
  return <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{children}</h4>
}
function FG({ l, h, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{l}</label>
      {children}
      {h && <div className="form-hint">{h}</div>}
    </div>
  )
}
function Tog({ l, h, val, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{l}</div>
        {h && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{h}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={val} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
