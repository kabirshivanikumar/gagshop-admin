import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext({})

const DEFAULTS = {
  site_name: 'VoidEnterprises', primary_color: '#6366f1', secondary_color: '#8b5cf6',
  accent_color: '#06b6d4', background_dark: '#0f0f1a', background_card: '#1a1a2e',
  currency_symbol: '$', currency_code: 'USD', admin_email: '',
  paypal_email: '', stripe_public_key: '', payment_methods: '["paypal","stripe","crypto"]',
  ticker_text: '🎮 New items weekly', ticker_enabled: 'true',
  emailjs_service_id: '', emailjs_template_id: '', emailjs_public_key: '',
  tax_rate: '0', maintenance_mode: 'false', logo_url: '',
  banner_headline: 'The #1 Roblox Shop', banner_subtext: 'Premium items & game passes',
  hero_cta_text: 'Shop Now', footer_text: '© 2025 VoidEnterprises',
  social_discord: '', social_twitter: '', social_youtube: '', banner_url: '',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    try {
      const { data } = await supabase.from('site_settings').select('key, value')
      const map = {}
      data?.forEach(r => { map[r.key] = r.value })
      setSettings(s => ({ ...s, ...map }))
    } catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  async function updateSettings(updates) {
    const next = { ...settings }
    for (const [key, value] of Object.entries(updates)) {
      const v = typeof value === 'object' ? JSON.stringify(value) : String(value)
      next[key] = v
      await supabase.from('site_settings').update({ value: v }).eq('key', key)
    }
    setSettings(next)
  }

  function get(key, fallback = '') { return settings[key] ?? fallback }
  function getJSON(key, fallback = []) {
    try { return JSON.parse(settings[key] ?? JSON.stringify(fallback)) } catch { return fallback }
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, get, getJSON, updateSettings, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
