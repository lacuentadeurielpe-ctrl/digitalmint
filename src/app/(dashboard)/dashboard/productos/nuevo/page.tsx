'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AgentProgress from '@/components/productos/AgentProgress'

const EJEMPLOS = [
  'Curso para freelancers que quieren conseguir sus primeros clientes en LinkedIn sin experiencia previa',
  'Ebook sobre cómo organizar las finanzas personales cuando tienes ingresos variables como emprendedor',
  'Template pack de Notion para gestionar proyectos como agencia de marketing digital',
  'Mini curso de productividad para madres emprendedoras que trabajan desde casa',
]

type AgentState = 'waiting' | 'running' | 'done'

const TOTAL_AGENTS = 7

async function runAgente(productId: string, agente: number): Promise<{ ok: boolean; next: number | null }> {
  const res = await fetch('/api/productos/agente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, agente }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? `Agente ${agente} falló`)
  }
  return res.json()
}

export default function NuevoProductoPage() {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [phase, setPhase] = useState<'form' | 'generating'>('form')
  const [agentStates, setAgentStates] = useState<AgentState[]>(
    Array(TOTAL_AGENTS).fill('waiting') as AgentState[]
  )
  const [error, setError] = useState('')

  function setAgentRunning(i: number) {
    setAgentStates(prev => { const s = [...prev] as AgentState[]; s[i] = 'running'; return s })
  }
  function setAgentDone(i: number) {
    setAgentStates(prev => { const s = [...prev] as AgentState[]; s[i] = 'done'; return s })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) return

    setPhase('generating')
    setError('')
    setAgentStates(Array(TOTAL_AGENTS).fill('waiting') as AgentState[])

    const res = await fetch('/api/productos/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: idea.trim() }),
    })
    if (!res.ok) {
      setError('Error al iniciar. Verifica tu sesión e intenta de nuevo.')
      setPhase('form')
      return
    }
    const { productId } = await res.json()

    try {
      // Critical agents 1-4 — must succeed (Agent 4 marks product as 'complete')
      for (let agente = 1; agente <= 4; agente++) {
        setAgentRunning(agente - 1)
        await runAgente(productId, agente)
        setAgentDone(agente - 1)
      }
      // Bonus agents 5-6 — failures are not fatal (product is already complete)
      for (let agente = 5; agente <= TOTAL_AGENTS; agente++) {
        setAgentRunning(agente - 1)
        try {
          await runAgente(productId, agente)
        } catch (bonusErr) {
          console.warn(`Agente ${agente} (extras) falló:`, bonusErr)
        }
        setAgentDone(agente - 1)
      }
      router.push(`/dashboard/productos/${productId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Falló durante la generación: ${msg}. Puedes reintentar desde "Mis productos".`)
      setPhase('form')
    }
  }

  if (phase === 'generating') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h1 className="text-2xl font-bold text-white mb-2">Generando tu producto</h1>
          <p className="text-slate-400 text-sm">
            7 agentes de IA trabajan en tu idea. Esto toma entre 3 y 5 minutos.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 mb-6">
          <p className="text-xs text-slate-500 mb-1">Tu idea</p>
          <p className="text-sm text-slate-300 italic">"{idea}"</p>
        </div>

        <AgentProgress agentStates={agentStates} />

        <p className="text-center text-xs text-slate-600 mt-6">
          No cierres esta pestaña — el Agente Escritores genera el contenido completo en paralelo
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Nuevo producto</h1>
        <p className="text-slate-400">
          Describe tu idea. En minutos tendrás un producto digital completo listo para vender.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Describe tu idea de producto digital
          </label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            rows={5}
            required
            placeholder="Ej: Quiero crear un curso para diseñadores gráficos freelance que quieran cobrar más por sus proyectos sin perder clientes..."
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">{idea.length} caracteres — mínimo recomendado: 50</p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-2">Ejemplos (haz click para usar):</p>
          <div className="space-y-2">
            {EJEMPLOS.map((ej, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdea(ej)}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 border border-white/5 text-xs text-slate-400 hover:text-slate-200 hover:border-purple-500/30 transition"
              >
                "{ej}"
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={idea.trim().length < 20}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✨ Generar producto completo con IA
        </button>
      </form>

      <div className="mt-10 p-5 bg-slate-800/30 border border-white/5 rounded-xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Qué recibirás — producto digital completo
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          {[
            '📋 Nombre + subtítulo memorable',
            '👤 Avatar psicográfico detallado',
            '💰 Precio con estrategia de anclaje',
            '📦 20,000+ palabras de contenido real',
            '📥 Descargable como PDF completo',
            '💬 Scripts de WhatsApp para vender',
            '📱 3 ganchos para Facebook Ads',
            '🏗️ Estructura con Biblia del producto',
          ].map(item => (
            <div key={item} className="flex items-center gap-2">
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
