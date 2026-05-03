'use client'

import { useState } from 'react'

interface ExportButtonsProps {
  productId: string
  isComplete: boolean
}

const PLATFORMS = [
  { key: 'gumroad', label: 'Gumroad', icon: '🛒' },
  { key: 'hotmart', label: 'Hotmart', icon: '🔥' },
  { key: 'stripe', label: 'Stripe', icon: '💳' },
  { key: 'custom', label: 'Custom', icon: '🔗' },
] as const

export default function ExportButtons({ productId, isComplete }: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, 'ok' | 'error'>>({})

  async function downloadPDF() {
    setLoading('pdf')
    try {
      const res = await fetch(`/api/exports/pdf/${productId}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `producto-${productId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error generando PDF')
    } finally {
      setLoading(null)
    }
  }

  async function sendWebhook(plataforma: string) {
    setLoading(plataforma)
    try {
      const res = await fetch(`/api/exports/webhook/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plataforma }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Error enviando webhook')
        setResults(r => ({ ...r, [plataforma]: 'error' }))
      } else {
        setResults(r => ({ ...r, [plataforma]: 'ok' }))
      }
    } catch {
      setResults(r => ({ ...r, [plataforma]: 'error' }))
    } finally {
      setLoading(null)
    }
  }

  if (!isComplete) return null

  return (
    <div className="mb-8 p-5 bg-slate-800/50 border border-white/5 rounded-xl">
      <h2 className="text-sm font-semibold text-white mb-4">📤 Exportar producto</h2>
      <div className="flex flex-wrap gap-3">
        {/* PDF */}
        <button
          onClick={downloadPDF}
          disabled={loading === 'pdf'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition disabled:opacity-60"
        >
          {loading === 'pdf' ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : '📄'}
          Descargar PDF
        </button>

        {/* Webhooks */}
        {PLATFORMS.map(({ key, label, icon }) => {
          const status = results[key]
          return (
            <button
              key={key}
              onClick={() => sendWebhook(key)}
              disabled={loading === key}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
                status === 'ok'
                  ? 'bg-green-600/20 border border-green-500/30 text-green-300'
                  : status === 'error'
                  ? 'bg-red-600/20 border border-red-500/30 text-red-300'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-white/5'
              }`}
            >
              {loading === key ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : status === 'ok' ? '✓' : status === 'error' ? '✗' : icon}
              {label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Los webhooks envían los datos del producto a las URLs configuradas en Configuración.
      </p>
    </div>
  )
}
