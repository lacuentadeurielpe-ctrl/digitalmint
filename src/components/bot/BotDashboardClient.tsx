'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ESTADO_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  calificando: 'Calificando',
  presentando: 'Presentando',
  objeciones: 'Objeciones',
  cerrando: 'Cerrando',
  pago_pendiente: 'Esperando pago',
  pago_recibido: 'Pago recibido',
  cliente: 'Cliente',
  pausado: 'Pausado',
}

const ESTADO_COLOR: Record<string, string> = {
  nuevo: 'bg-slate-700 text-slate-300',
  calificando: 'bg-blue-500/15 text-blue-300',
  presentando: 'bg-purple-500/15 text-purple-300',
  objeciones: 'bg-orange-500/15 text-orange-300',
  cerrando: 'bg-yellow-500/15 text-yellow-300',
  pago_pendiente: 'bg-yellow-500/20 text-yellow-300 animate-pulse',
  pago_recibido: 'bg-green-500/15 text-green-300',
  cliente: 'bg-green-500/20 text-green-300',
  pausado: 'bg-red-500/15 text-red-300',
}

interface Conversacion {
  id: string
  cliente_phone: string
  nombre_cliente: string | null
  estado: string
  agente_actual: string
  pausado: boolean
  updated_at: string
  inventario_bot: { products: { nombre_producto: string } } | null
}

interface Pago {
  id: string
  monto: number | null
  metodo: string | null
  numero_operacion: string | null
  comprobante_url: string | null
  estado: string
  created_at: string
  bot_conversations: { cliente_phone: string; nombre_cliente: string | null } | null
  inventario_bot: { products: { nombre_producto: string } } | null
}

interface Props {
  botConfigurado: boolean
  pagosConfigurados: boolean
  botPhone: string | null
  webhookUrl: string
  conversaciones: Conversacion[]
  pagos: Pago[]
}

export default function BotDashboardClient({ botConfigurado, pagosConfigurados, botPhone, webhookUrl, conversaciones: initConvs, pagos: initPagos }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'conversaciones' | 'pagos'>('conversaciones')
  const [convs, setConvs] = useState(initConvs)
  const [pagos, setPagos] = useState(initPagos)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function togglePausa(conv: Conversacion) {
    setProcesando(conv.id)
    const nuevoPausado = !conv.pausado
    await fetch(`/api/bot/conversaciones/${conv.id}/pausar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pausado: nuevoPausado }),
    })
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, pausado: nuevoPausado } : c))
    setProcesando(null)
  }

  async function accionPago(pagoId: string, accion: 'confirmar' | 'rechazar') {
    setProcesando(pagoId)
    await fetch(`/api/bot/pagos/${pagoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion }),
    })
    setPagos(prev => prev.filter(p => p.id !== pagoId))
    setProcesando(null)
    router.refresh()
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Bot de WhatsApp</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema multiagéntico de conversión</p>
        </div>
        <a href="/dashboard/configuracion" className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:border-purple-500/50 hover:text-white transition">
          ⚙️ Configurar
        </a>
      </div>

      {/* Estado general */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatusCard
          ok={botConfigurado}
          label="Bot WhatsApp"
          detail={botConfigurado ? `+${botPhone}` : 'Sin configurar'}
          href="/dashboard/configuracion"
        />
        <StatusCard
          ok={pagosConfigurados}
          label="Métodos de pago"
          detail={pagosConfigurados ? 'Yape/Plin/BCP' : 'Sin configurar'}
          href="/dashboard/configuracion"
        />
        <StatusCard
          ok={(convs.filter(c => !c.pausado && c.estado !== 'cliente').length) > 0}
          label="Conversaciones activas"
          detail={`${convs.filter(c => !c.pausado && c.estado !== 'cliente').length} en proceso`}
        />
      </div>

      {/* Webhook */}
      <div className="mb-6 bg-slate-800/50 border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-1">URL del webhook — configura en YCloud como "Incoming Message Webhook"</p>
            <code className="text-xs text-purple-300 truncate block">{webhookUrl}</code>
          </div>
          <button onClick={copyWebhook} className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-slate-300 hover:text-white transition">
            {copied ? '✓ Copiado' : '📋 Copiar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-6">
        {([['conversaciones', 'Conversaciones', convs.length], ['pagos', 'Pagos pendientes', pagos.length]] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${tab === key ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${key === 'pagos' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-400'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversaciones */}
      {tab === 'conversaciones' && (
        <div className="space-y-2">
          {convs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">💬</p>
              <p className="text-slate-400 text-sm">Sin conversaciones aún.</p>
              <p className="text-slate-600 text-xs mt-1">Las conversaciones aparecerán aquí cuando lleguen mensajes de WhatsApp.</p>
            </div>
          ) : convs.map(conv => {
            const productoNombre = (conv.inventario_bot as any)?.products?.nombre_producto
            const label = conv.nombre_cliente ?? `+${conv.cliente_phone}`
            return (
              <div key={conv.id} className={`flex items-center gap-4 p-4 rounded-xl border transition ${conv.pausado ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/50 border-white/5'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{label}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[conv.estado] ?? 'bg-slate-700 text-slate-400'}`}>
                      {ESTADO_LABELS[conv.estado] ?? conv.estado}
                    </span>
                    {conv.pausado && <span className="text-xs text-red-400 font-medium">⏸ Pausado</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {productoNombre && <span className="text-purple-400">{productoNombre}</span>}
                    <span>{new Date(conv.updated_at).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="capitalize">Agente: {conv.agente_actual}</span>
                  </div>
                </div>
                <button
                  onClick={() => togglePausa(conv)}
                  disabled={procesando === conv.id}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${conv.pausado ? 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-red-500/30 hover:text-red-300'}`}
                >
                  {procesando === conv.id ? '...' : conv.pausado ? '▶ Reanudar bot' : '⏸ Tomar control'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagos pendientes */}
      {tab === 'pagos' && (
        <div className="space-y-3">
          {pagos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">💳</p>
              <p className="text-slate-400 text-sm">No hay pagos pendientes de confirmación.</p>
            </div>
          ) : pagos.map(pago => {
            const conv = pago.bot_conversations as any
            const inv = pago.inventario_bot as any
            const clienteLabel = conv?.nombre_cliente ?? (conv?.cliente_phone ? `+${conv.cliente_phone}` : 'Desconocido')
            return (
              <div key={pago.id} className="p-5 bg-slate-800/50 border border-yellow-500/20 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">{clienteLabel}</span>
                      {pago.monto && <span className="text-green-400 font-bold">${pago.monto}</span>}
                      {pago.metodo && <span className="text-xs text-slate-500 uppercase">{pago.metodo}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Producto: <span className="text-purple-300">{inv?.products?.nombre_producto ?? '—'}</span>
                      {' · '}
                      {new Date(pago.created_at).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {pago.numero_operacion && (
                      <p className="text-xs text-slate-400">N° Operación: <span className="text-white font-mono">{pago.numero_operacion}</span></p>
                    )}
                    {pago.comprobante_url && (
                      <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 underline mt-1 inline-block">
                        Ver comprobante 🖼
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => accionPago(pago.id, 'confirmar')}
                      disabled={procesando === pago.id}
                      className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-semibold hover:bg-green-500/30 transition disabled:opacity-50"
                    >
                      {procesando === pago.id ? '...' : '✅ Confirmar'}
                    </button>
                    <button
                      onClick={() => accionPago(pago.id, 'rechazar')}
                      disabled={procesando === pago.id}
                      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusCard({ ok, label, detail, href }: { ok: boolean; label: string; detail: string; href?: string }) {
  const content = (
    <div className={`p-4 rounded-xl border transition ${ok ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-yellow-400'}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-sm font-medium ${ok ? 'text-white' : 'text-yellow-300'}`}>{detail}</p>
      {!ok && href && <p className="text-xs text-slate-500 mt-1">Configura →</p>}
    </div>
  )
  return href && !ok ? <a href={href}>{content}</a> : content
}
