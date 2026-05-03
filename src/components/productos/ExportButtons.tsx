'use client'

import { useState } from 'react'
import type { PdfTheme } from '@/lib/pdf/producto-pdf'

interface ExportButtonsProps {
  productId: string
  isComplete: boolean
  nombreProducto?: string
  subtitulo?: string | null
}

const PLATFORMS = [
  { key: 'gumroad', label: 'Gumroad', icon: '🛒' },
  { key: 'hotmart', label: 'Hotmart', icon: '🔥' },
  { key: 'stripe', label: 'Stripe', icon: '💳' },
  { key: 'custom', label: 'Custom', icon: '🔗' },
] as const

const THEME_OPTIONS: { key: PdfTheme; label: string; preview: string }[] = [
  { key: 'dark',   label: 'Oscuro',  preview: 'bg-slate-900 border-purple-500/30' },
  { key: 'light',  label: 'Claro',   preview: 'bg-white border-violet-300' },
  { key: 'purple', label: 'Violeta', preview: 'bg-indigo-900 border-fuchsia-400/50' },
]

export default function ExportButtons({ productId, isComplete, nombreProducto, subtitulo }: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, 'ok' | 'error'>>({})
  const [showCustomizer, setShowCustomizer] = useState(false)

  const [config, setConfig] = useState({
    title:       nombreProducto ?? '',
    subtitle:    subtitulo ?? '',
    footer:      '',
    theme:       'dark' as PdfTheme,
    showAvatar:  true,
    showScripts: true,
    showGanchos: true,
  })

  async function downloadPDF() {
    setLoading('pdf')
    try {
      const params = new URLSearchParams()
      params.set('theme', config.theme)
      if (config.footer.trim())    params.set('footer',   config.footer.trim())
      if (config.title.trim())     params.set('title',    config.title.trim())
      if (config.subtitle.trim())  params.set('subtitle', config.subtitle.trim())
      if (!config.showAvatar)  params.set('avatar',  '0')
      if (!config.showScripts) params.set('scripts', '0')
      if (!config.showGanchos) params.set('ganchos', '0')

      const res = await fetch(`/api/exports/pdf/${productId}?${params}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (config.title || nombreProducto || 'producto')
        .replace(/[^a-z0-9]/gi, '-').toLowerCase()
      a.download = `${safeName}.pdf`
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

  const toggle = (key: 'showAvatar' | 'showScripts' | 'showGanchos') =>
    setConfig(c => ({ ...c, [key]: !c[key] }))

  return (
    <div className="mb-8 p-5 bg-slate-800/50 border border-white/5 rounded-xl">
      <h2 className="text-sm font-semibold text-white mb-4">📤 Exportar producto</h2>

      <div className="flex flex-wrap gap-3">
        {/* PDF download */}
        <button
          onClick={downloadPDF}
          disabled={loading === 'pdf'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition disabled:opacity-60"
        >
          {loading === 'pdf'
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : '📄'}
          Descargar PDF
        </button>

        {/* Customize toggle */}
        <button
          onClick={() => setShowCustomizer(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
            showCustomizer
              ? 'bg-slate-700 border-purple-500/50 text-purple-300'
              : 'bg-slate-800 border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          ⚙️ Personalizar PDF
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
              {loading === key
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : status === 'ok' ? '✓' : status === 'error' ? '✗' : icon}
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Customizer panel ── */}
      {showCustomizer && (
        <div className="mt-5 pt-5 border-t border-white/5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Personalización del PDF
          </p>

          {/* Title + Subtitle */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Título en el PDF</label>
              <input
                type="text"
                value={config.title}
                onChange={e => setConfig(c => ({ ...c, title: e.target.value }))}
                placeholder={nombreProducto ?? 'Título del producto'}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Subtítulo en el PDF</label>
              <input
                type="text"
                value={config.subtitle}
                onChange={e => setConfig(c => ({ ...c, subtitle: e.target.value }))}
                placeholder={subtitulo ?? 'Subtítulo'}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              Pie de página personalizado
              <span className="ml-2 text-slate-600">(dejar vacío = "DigitalMint · título")</span>
            </label>
            <input
              type="text"
              value={config.footer}
              onChange={e => setConfig(c => ({ ...c, footer: e.target.value }))}
              placeholder={`DigitalMint · ${config.title || nombreProducto || 'Mi Producto'}`}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Tema de color</label>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ key, label, preview }) => (
                <button
                  key={key}
                  onClick={() => setConfig(c => ({ ...c, theme: key }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    config.theme === key
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-white/10 bg-slate-800 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border ${preview}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Section toggles */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Secciones a incluir</label>
            <div className="flex flex-wrap gap-3">
              {([
                { key: 'showAvatar',  label: '👤 Avatar del cliente' },
                { key: 'showScripts', label: '💬 Scripts WhatsApp' },
                { key: 'showGanchos', label: '📱 Ganchos Facebook' },
              ] as { key: 'showAvatar' | 'showScripts' | 'showGanchos'; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    config[key]
                      ? 'border-green-500/40 bg-green-500/10 text-green-300'
                      : 'border-white/10 bg-slate-800 text-slate-500 line-through'
                  }`}
                >
                  {config[key] ? '✓' : '✗'} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Download with config */}
          <button
            onClick={downloadPDF}
            disabled={loading === 'pdf'}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === 'pdf'
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando PDF...</>
              : '📄 Descargar PDF personalizado'}
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-3">
        Los webhooks envían los datos del producto a las URLs configuradas en Configuración.
      </p>
    </div>
  )
}
