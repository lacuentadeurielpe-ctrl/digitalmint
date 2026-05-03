'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  webhookGumroad: string
  webhookHotmart: string
  webhookStripe: string
  webhookCustom: string
}

export default function WebhookConfigClient({
  userId,
  webhookGumroad,
  webhookHotmart,
  webhookStripe,
  webhookCustom,
}: Props) {
  const [gumroad, setGumroad] = useState(webhookGumroad)
  const [hotmart, setHotmart] = useState(webhookHotmart)
  const [stripe, setStripe] = useState(webhookStripe)
  const [custom, setCustom] = useState(webhookCustom)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    await supabase.from('user_settings').upsert({
      user_id: userId,
      webhook_gumroad: gumroad || null,
      webhook_hotmart: hotmart || null,
      webhook_stripe: stripe || null,
      webhook_custom: custom || null,
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const fields = [
    { label: 'Gumroad', icon: '🛒', value: gumroad, set: setGumroad, placeholder: 'https://...' },
    { label: 'Hotmart', icon: '🔥', value: hotmart, set: setHotmart, placeholder: 'https://...' },
    { label: 'Stripe', icon: '💳', value: stripe, set: setStripe, placeholder: 'https://...' },
    { label: 'Custom / Make / Zapier', icon: '🔗', value: custom, set: setCustom, placeholder: 'https://...' },
  ]

  return (
    <div className="space-y-4">
      {fields.map(f => (
        <div key={f.label}>
          <label className="block text-xs text-slate-400 mb-1">{f.icon} {f.label}</label>
          <input
            type="url"
            value={f.value}
            onChange={e => f.set(e.target.value)}
            placeholder={f.placeholder}
            className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition disabled:opacity-60"
      >
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar webhooks'}
      </button>
    </div>
  )
}
