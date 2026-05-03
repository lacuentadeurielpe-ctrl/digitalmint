'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  botActivo: boolean
  botPhone: string
  yclouKey: string
  userId: string
}

export default function BotConfigClient({ botActivo, botPhone, yclouKey, userId }: Props) {
  const [phone, setPhone] = useState(botPhone)
  const [key, setKey] = useState(yclouKey)
  const [activo, setActivo] = useState(botActivo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        bot_phone: phone,
        ycloud_api_key: key,
        bot_activo: activo,
      })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3 pt-2 border-t border-white/5">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Número WhatsApp (con código de país)</label>
        <input
          type="text"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="51987654321"
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">YCloud API Key</label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="••••••••••••••••"
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActivo(v => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${activo ? 'bg-purple-600' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${activo ? 'translate-x-5' : ''}`} />
        </button>
        <span className="text-sm text-slate-300">{activo ? 'Bot activo' : 'Bot inactivo'}</span>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition disabled:opacity-50"
      >
        {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar configuración'}
      </button>
    </div>
  )
}
