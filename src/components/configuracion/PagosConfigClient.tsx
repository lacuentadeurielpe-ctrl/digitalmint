'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  yapeNumero: string
  plinNumero: string
  bcpCuenta: string
  bcpTitular: string
  botNombre: string
}

export default function PagosConfigClient({ userId, yapeNumero, plinNumero, bcpCuenta, bcpTitular, botNombre }: Props) {
  const [form, setForm] = useState({ yapeNumero, plinNumero, bcpCuenta, bcpTitular, botNombre })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('user_settings').upsert({
      user_id: userId,
      yape_numero:  form.yapeNumero  || null,
      plin_numero:  form.plinNumero  || null,
      bcp_cuenta:   form.bcpCuenta   || null,
      bcp_titular:  form.bcpTitular  || null,
      bot_nombre:   form.botNombre   || 'Asistente',
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 pt-2 border-t border-white/5">
      <p className="text-xs text-slate-500">El bot enviará estos datos cuando el cliente quiera pagar. Deja vacíos los métodos que no uses.</p>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Nombre del bot (cómo se presenta)</label>
        <input type="text" value={form.botNombre} onChange={field('botNombre')}
          placeholder="Asistente"
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">💜 Número Yape</label>
          <input type="text" value={form.yapeNumero} onChange={field('yapeNumero')}
            placeholder="987654321"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">💙 Número Plin</label>
          <input type="text" value={form.plinNumero} onChange={field('plinNumero')}
            placeholder="987654321"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">🏦 Cuenta BCP</label>
          <input type="text" value={form.bcpCuenta} onChange={field('bcpCuenta')}
            placeholder="XXX-XXXXXXXX-X-XX"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Titular BCP</label>
          <input type="text" value={form.bcpTitular} onChange={field('bcpTitular')}
            placeholder="Tu nombre completo"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition disabled:opacity-50"
      >
        {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar datos de pago'}
      </button>
    </div>
  )
}
