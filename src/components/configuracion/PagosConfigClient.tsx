'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MONEDAS = [
  { value: 'PEN', simbolo: 'S/',   label: 'Soles peruanos (S/)' },
  { value: 'USD', simbolo: '$',    label: 'Dólares americanos ($)' },
  { value: 'ARS', simbolo: '$',    label: 'Pesos argentinos (AR$)' },
  { value: 'MXN', simbolo: '$',    label: 'Pesos mexicanos (MX$)' },
  { value: 'COP', simbolo: '$',    label: 'Pesos colombianos (COP$)' },
  { value: 'CLP', simbolo: '$',    label: 'Pesos chilenos (CLP$)' },
  { value: 'BRL', simbolo: 'R$',   label: 'Reales brasileños (R$)' },
  { value: 'EUR', simbolo: '€',    label: 'Euros (€)' },
]

const SIMBOLOS: Record<string, string> = {
  PEN: 'S/', USD: '$', ARS: 'AR$', MXN: 'MX$',
  COP: 'COP$', CLP: 'CLP$', BRL: 'R$', EUR: '€',
}

interface Props {
  userId: string
  moneda: string
  yapeNumero: string
  plinNumero: string
  bcpCuenta: string
  bcpTitular: string
  bbvaCuenta: string
  bbvaTitular: string
  interbankCuenta: string
  mercadopagoLink: string
  paypalLink: string
  botNombre: string
}

export default function PagosConfigClient({
  userId, moneda: initMoneda = 'PEN',
  yapeNumero, plinNumero, bcpCuenta, bcpTitular,
  bbvaCuenta, bbvaTitular, interbankCuenta, mercadopagoLink, paypalLink, botNombre,
}: Props) {
  const [moneda, setMoneda] = useState(initMoneda)
  const [form, setForm] = useState({
    yapeNumero, plinNumero, bcpCuenta, bcpTitular,
    bbvaCuenta, bbvaTitular, interbankCuenta, mercadopagoLink, paypalLink, botNombre,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function handleMonedaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMoneda(e.target.value)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('user_settings').upsert({
      user_id:           userId,
      moneda,
      simbolo_moneda:    SIMBOLOS[moneda] ?? 'S/',
      bot_nombre:        form.botNombre   || 'Asistente',
      yape_numero:       form.yapeNumero  || null,
      plin_numero:       form.plinNumero  || null,
      bcp_cuenta:        form.bcpCuenta   || null,
      bcp_titular:       form.bcpTitular  || null,
      bbva_cuenta:       form.bbvaCuenta  || null,
      bbva_titular:      form.bbvaTitular || null,
      interbank_cuenta:  form.interbankCuenta || null,
      mercadopago_link:  form.mercadopagoLink || null,
      paypal_link:       form.paypalLink  || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Input = ({ label, fieldKey, placeholder }: { label: string; fieldKey: keyof typeof form; placeholder: string }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input type="text" value={form[fieldKey]} onChange={field(fieldKey)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
    </div>
  )

  return (
    <div className="space-y-5 pt-2 border-t border-white/5">
      <p className="text-xs text-slate-500">El bot enviará estos datos cuando el cliente quiera pagar. Deja vacíos los métodos que no uses.</p>

      {/* Moneda */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">🌍 Moneda de tu tienda</label>
        <select value={moneda} onChange={handleMonedaChange}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500">
          {MONEDAS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <p className="text-xs text-slate-600 mt-1">Los precios del inventario se mostrarán con este símbolo: <span className="text-purple-400 font-mono">{SIMBOLOS[moneda] ?? 'S/'}</span></p>
      </div>

      {/* Nombre del bot */}
      <Input label="Nombre del bot (cómo se presenta al cliente)" fieldKey="botNombre" placeholder="Asistente" />

      {/* Métodos Perú */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">🇵🇪 Métodos Perú</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="💜 Número Yape" fieldKey="yapeNumero" placeholder="987654321" />
          <Input label="💙 Número Plin" fieldKey="plinNumero" placeholder="987654321" />
          <Input label="🏦 Cuenta BCP" fieldKey="bcpCuenta" placeholder="193-XXXXXXXX-0-XX" />
          <Input label="Titular BCP" fieldKey="bcpTitular" placeholder="Tu nombre completo" />
          <Input label="🔵 Cuenta BBVA" fieldKey="bbvaCuenta" placeholder="XXXX XXXX XXXX XXXX" />
          <Input label="Titular BBVA" fieldKey="bbvaTitular" placeholder="Tu nombre completo" />
          <Input label="🟢 Cuenta Interbank" fieldKey="interbankCuenta" placeholder="XXXX XXXX XXXX XXXX" />
        </div>
      </div>

      {/* Métodos internacionales */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">🌐 Internacional</p>
        <div className="grid grid-cols-1 gap-3">
          <Input label="💛 Link MercadoPago (Argentina, México, Colombia…)" fieldKey="mercadopagoLink" placeholder="https://mpago.la/XXXXXX" />
          <Input label="🔷 Usuario / Link PayPal" fieldKey="paypalLink" placeholder="paypal.me/tunombre o correo" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition disabled:opacity-50">
        {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar configuración de pagos'}
      </button>
    </div>
  )
}
