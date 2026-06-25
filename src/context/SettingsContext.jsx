import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext({})

const DEFAULTS = {
  site_name: 'VoidEnterprises',
  site_tagline: 'Premium Roblox Items & Game Passes',
  ticker_text: '🎮 New items every week · 🔥 Flash sales daily · 💎 Premium members get 10% off',
  ticker_enabled: 'true',
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  accent_color: '#06b6d4',
  background_dark: '#0f0f1a',
  background_card: '#1a1a2e',
  text_primary: '#ffffff',
  logo_url: '',
  banner_url: '',
  banner_headline: 'The #1 Roblox Shop',
  banner_subtext: 'Top-tier game passes, items and accessories',
  payment_methods: '["paypal","stripe","crypto"]',
  paypal_email: '',
  stripe_public_key: '',
  currency_symbol: '$',
  currency_code: 'USD',
  admin_email: '',
  emailjs_service_id: '',
  emailjs_template_id: '',
  emailjs_public_key: '',
  free_shipping_threshold: '0',
  tax_rate: '0',
  maintenance_mode: 'false',
  hero_cta_text: 'Shop Now',
  footer_text: '© 2025 VoidEnterprises. All rights reserved.',
  social_discord: '',
  social_twitter: '',
  social_youtube: '',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSettings() }, [])
  useEffect(() => { applyTheme(settings) }, [settings])

  async function fetchSettings() {
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value')
      if (error) throw error
      const map = {}
      data?.forEach(row => { map[row.key] = row.value })
      setSettings(s => ({ ...s, ...map }))
    } catch (e) {
      console.warn('Settings fetch failed, using defaults:', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateSettings(updates) {
    const newSettings = { ...settings }
    for (const [key, value] of Object.entries(updates)) {
      const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value)
      newSettings[key] = strVal
      // Use upsert so new keys get created, not just updated
      await supabase.from('site_settings').upsert({ key, value: strVal }, { onConflict: 'key' })
    }
    setSettings(newSettings)
  }

  function get(key, fallback = '') { return settings[key] ?? fallback }

  function getJSON(key, fallback = []) {
    try { return JSON.parse(settings[key] ?? JSON.stringify(fallback)) }
    catch { return fallback }
  }

  function applyTheme(s) {
    const root = document.documentElement
    root.style.setProperty('--color-primary', s.primary_color || '#6366f1')
    root.style.setProperty('--color-secondary', s.secondary_color || '#8b5cf6')
    root.style.setProperty('--color-accent', s.accent_color || '#06b6d4')
    root.style.setProperty('--color-bg', s.background_dark || '#0f0f1a')
    root.style.setProperty('--color-card', s.background_card || '#1a1a2e')
    root.style.setProperty('--color-text', s.text_primary || '#ffffff')
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, get, getJSON, updateSettings, fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
