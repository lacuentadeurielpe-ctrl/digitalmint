'use client'

import { useState } from 'react'
import type { TendenciasOutput, IdeaTendencia } from '@/lib/ai/tendencias'

const CATEGORIAS = [
  { key: 'todos',           label: 'Todos los nichos',     icon: '🌐' },
  { key: 'ingresos online', label: 'Ingresos online',       icon: '💰' },
  { key: 'marketing digital', label: 'Marketing digital',   icon: '📣' },
  { key: 'productividad',   label: 'Productividad',          icon: '⚡' },
  { key: 'salud y bienestar', label: 'Salud y bienestar',   icon: '🌿' },
  { key: 'finanzas personales', label: 'Finanzas',          icon: '📊' },
  { key: 'IA y tecnología', label: 'IA y tecnología',        icon: '🤖' },
  { key: 'pequeños negocios', label: 'Pequeños negocios',   icon: '🏪' },
]

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 65) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 border-green-500/20'
  if (score >= 65) return 'bg-yellow-500/10 border-yellow-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={color}>{value}/10</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value * 10}%`, backgroundColor: value >= 8 ? '#4ade80' : value >= 6 ? '#facc15' : '#f87171' }}
        />
      </div>
    </div>
  )
}

function IdeaCard({ idea, rank }: { idea: IdeaTendencia; rank: number }) {
  const [copied, setCopied] = useState(false)

  async function copyIdea() {
    await navigator.clipboard.writeText(idea.idea_prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const encodedIdea = encodeURIComponent(idea.idea_prompt)

  return (
    <div className={`relative rounded-xl border p-5 transition-all hover:border-purple-500/30 ${scoreBg(idea.score_total)}`}>
      {/* Rank + score */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600">#{rank}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            idea.score_total >= 80
              ? 'bg-green-500/15 border-green-500/30 text-green-400'
              : idea.score_total >= 65
              ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
              : 'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {idea.nicho}
          </span>
        </div>
        <div className="shrink-0 text-center">
          <div className={`text-2xl font-bold ${scoreColor(idea.score_total)}`}>{idea.score_total}</div>
          <div className="text-xs text-slate-600">/ 100</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white mb-3 leading-snug">{idea.titulo}</h3>

      {/* Type + price */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">{idea.tipo_producto}</span>
        <span className="text-xs text-green-400 font-medium">${idea.precio_estimado} USD</span>
      </div>

      {/* Pain + timing */}
      <div className="space-y-2 mb-4 text-xs">
        <div className="flex gap-2">
          <span className="text-red-400 shrink-0">●</span>
          <span className="text-slate-400 leading-relaxed">{idea.dolor}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-yellow-400 shrink-0">◆</span>
          <span className="text-slate-400 leading-relaxed">{idea.porque_ahora}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-blue-400 shrink-0">▸</span>
          <span className="text-slate-400 leading-relaxed">{idea.audiencia}</span>
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-1.5 mb-4 p-3 bg-slate-900/60 rounded-lg">
        <ScoreBar label="Intensidad del dolor"  value={idea.score_dolor}    color="text-red-400" />
        <ScoreBar label="Historial de pago"     value={idea.score_pago}     color="text-green-400" />
        <ScoreBar label="Brecha de mercado"     value={idea.score_gap}      color="text-blue-400" />
        <ScoreBar label="Claridad de audiencia" value={idea.score_audiencia} color="text-purple-400" />
        <ScoreBar label="Relevancia ahora"      value={idea.score_timing}   color="text-yellow-400" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={`/dashboard/productos/nuevo?idea=${encodedIdea}`}
          className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold text-center transition"
        >
          ✨ Generar este producto
        </a>
        <button
          onClick={copyIdea}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-white/5"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </div>
  )
}

const LOADING_STEPS = [
  'Analizando intensidad de dolor por categoría...',
  'Evaluando historial de pago en mercados hispanohablantes...',
  'Detectando brechas de mercado y competencia...',
  'Calibrando timing con contexto de Mayo 2026...',
  'Calculando scores de vendibilidad...',
  'Ordenando por potencial de venta...',
]

function LoadingState() {
  const [step, setStep] = useState(0)

  // cycle through steps
  if (typeof window !== 'undefined') {
    // Advance step every ~3s to fill the ~18s wait
    setTimeout(() => setStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 3000)
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">📡</div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-semibold">Analizando el mercado...</p>
        <p className="text-xs text-slate-400 max-w-xs">{LOADING_STEPS[step]}</p>
      </div>
      <div className="flex gap-1.5">
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 w-6 rounded-full transition-all duration-500 ${i <= step ? 'bg-purple-500' : 'bg-slate-800'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function TendenciasPage() {
  const [categoria, setCategoria] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<TendenciasOutput | null>(null)
  const [error, setError] = useState('')

  async function analizar() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tendencias/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error en el análisis')
      }
      const data: TendenciasOutput = await res.json()
      setOutput(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📡</span>
          <h1 className="text-2xl font-bold text-white">Radar de Vendibilidad</h1>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          No busca lo que está de moda — analiza lo que <span className="text-white font-medium">duele lo suficiente para que la gente pague hoy</span>.
          Calificado en 5 dimensiones: intensidad del dolor, historial de pago, brecha de mercado, claridad de audiencia y relevancia actual.
        </p>
      </div>

      {/* Category selector */}
      <div className="mb-6">
        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Foco del análisis</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setCategoria(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                categoria === key
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'bg-slate-800/60 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-300'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Analyze button */}
      <div className="mb-8">
        <button
          onClick={analizar}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analizando mercado...</>
            : output
            ? '🔄 Regenerar análisis'
            : '📡 Analizar mercado ahora'}
        </button>
        {!output && !loading && (
          <p className="text-xs text-slate-600 mt-2">Toma entre 20 y 40 segundos — el análisis es profundo.</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Results */}
      {!loading && output && (
        <>
          {/* Market context banner */}
          {output.contexto.length > 0 && (
            <div className="mb-8 grid sm:grid-cols-3 gap-3">
              {output.contexto.map((insight, i) => (
                <div key={i} className="p-4 bg-slate-800/40 border border-white/5 rounded-xl">
                  <div className="text-base mb-2">{['💡', '🔍', '⚡'][i]}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {output.ideas.length} ideas rankeadas por vendibilidad
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {output.categoria !== 'todos' ? `Categoría: ${output.categoria} · ` : ''}
                Score 80+ = altamente vendible · 65-79 = buena oportunidad · &lt;65 = mercado difícil
              </p>
            </div>
            <div className="text-xs text-slate-600">
              {new Date(output.generado_en).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Score legend */}
          <div className="flex gap-3 mb-6 text-xs">
            <span className="flex items-center gap-1.5 text-green-400"><span className="w-2 h-2 rounded-full bg-green-500" /> 80+ Alta vendibilidad</span>
            <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 65-79 Buena oportunidad</span>
            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500" /> &lt;65 Mercado difícil</span>
          </div>

          {/* Ideas grid */}
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {output.ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} rank={i + 1} />
            ))}
          </div>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-slate-600">
            Scores calculados con 5 dimensiones ponderadas · Haz clic en &ldquo;Generar este producto&rdquo; para lanzar los 7 agentes de IA sobre esa idea
          </p>
        </>
      )}

      {/* Empty state */}
      {!loading && !output && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">📡</div>
          <p className="text-slate-400 text-sm max-w-md">
            El radar analiza el mercado hispanohablante en 5 dimensiones para encontrar los productos digitales
            con mayor probabilidad de venta en este momento exacto.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-slate-600">
            {[
              ['🔴', 'Intensidad del dolor', 'Cuánto duele el problema'],
              ['💚', 'Historial de pago', 'Si ya pagan por esto'],
              ['🔵', 'Brecha de mercado', 'Calidad de soluciones actuales'],
              ['🟣', 'Claridad de audiencia', 'Qué tan identificable es'],
              ['🟡', 'Relevancia actual', 'Por qué ahora y no antes'],
              ['⭐', 'Score total', 'Vendibilidad compuesta 0-100'],
            ].map(([emoji, label, desc]) => (
              <div key={label} className="p-3 bg-slate-800/30 rounded-lg">
                <div className="text-base mb-1">{emoji}</div>
                <div className="font-medium text-slate-400 mb-0.5">{label}</div>
                <div>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
