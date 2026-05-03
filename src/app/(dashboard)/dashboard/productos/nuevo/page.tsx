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

export default function NuevoProductoPage() {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [phase, setPhase] = useState<'form' | 'generating'>('form')
  const [agentStates, setAgentStates] = useState<AgentState[]>(['waiting', 'waiting', 'waiting', 'waiting'])
  const [currentAgent, setCurrentAgent] = useState(0)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) return

    setPhase('generating')
    setError('')

    // 1. Crear el producto en DB
    const res = await fetch('/api/productos/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: idea.trim() }),
    })

    if (!res.ok) {
      setError('Error al iniciar la generación. Intenta de nuevo.')
      setPhase('form')
      return
    }

    const { productId } = await res.json()

    // 2. Conectar al SSE stream
    const eventSource = new EventSource(`/api/productos/stream/${productId}`)

    eventSource.addEventListener('agent_start', (e) => {
      const data = JSON.parse(e.data)
      const agentIdx = data.agent - 1
      setCurrentAgent(data.agent)
      setAgentStates(prev => {
        const next = [...prev] as AgentState[]
        next[agentIdx] = 'running'
        return next
      })
    })

    eventSource.addEventListener('agent_done', (e) => {
      const data = JSON.parse(e.data)
      const agentIdx = data.agent - 1
      setAgentStates(prev => {
        const next = [...prev] as AgentState[]
        next[agentIdx] = 'done'
        return next
      })
    })

    eventSource.addEventListener('complete', () => {
      eventSource.close()
      router.push(`/dashboard/productos/${productId}`)
    })

    eventSource.addEventListener('error', (e) => {
      eventSource.close()
      const data = JSON.parse((e as MessageEvent).data ?? '{}')
      setError(data.message ?? 'Ocurrió un error durante la generación')
      setPhase('form')
    })

    eventSource.onerror = () => {
      eventSource.close()
      setError('Conexión perdida. Verifica tu internet e intenta de nuevo.')
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
            4 agentes de IA están trabajando en tu idea. Esto toma entre 30 y 60 segundos.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 mb-6">
          <p className="text-xs text-slate-500 mb-1">Tu idea</p>
          <p className="text-sm text-slate-300 italic">"{idea}"</p>
        </div>

        <AgentProgress agentStates={agentStates} />

        <p className="text-center text-xs text-slate-600 mt-6">
          No cierres esta pestaña mientras se genera tu producto
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Nuevo producto</h1>
        <p className="text-slate-400">
          Describe tu idea con el mayor detalle posible. Cuanto más específico seas, mejor será el resultado.
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

        {/* Ejemplos */}
        <div>
          <p className="text-xs text-slate-500 mb-2">Ejemplos de ideas (haz click para usar):</p>
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
          ✨ Generar producto con IA
        </button>
      </form>

      {/* Qué genera */}
      <div className="mt-10 p-5 bg-slate-800/30 border border-white/5 rounded-xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Qué recibirás en minutos
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          {[
            '📋 Nombre + subtítulo memorable',
            '👤 Avatar psicográfico detallado',
            '💰 Precio con estrategia de anclaje',
            '📦 Estructura completa del producto',
            '🏪 Página de ventas lista para publicar',
            '📱 3 ganchos para redes sociales',
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
