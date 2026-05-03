'use client'

import { cn } from '@/lib/utils'

const AGENTS = [
  { label: 'Investigador', desc: 'Analizando mercado, competencia y dolores reales', icon: '🔍' },
  { label: 'Estratega', desc: 'Definiendo nombre, precio, avatar y posicionamiento', icon: '🧠' },
  { label: 'Arquitecto', desc: 'Diseñando estructura y escribiendo la Biblia del producto', icon: '📐' },
  { label: 'Escritores', desc: 'Equipo paralelo escribiendo cada sección del producto', icon: '✍️' },
  { label: 'Editor — Introducción', desc: 'Redactando la introducción que engancha al lector', icon: '📖' },
  { label: 'Editor — Conclusión', desc: 'Cerrando con la transformación y siguiente paso', icon: '🏁' },
  { label: 'Vendedor', desc: 'Creando scripts de WhatsApp y ganchos para Facebook Ads', icon: '🚀' },
]

type AgentState = 'waiting' | 'running' | 'done'

interface Props {
  agentStates: AgentState[]
}

export default function AgentProgress({ agentStates }: Props) {
  return (
    <div className="space-y-3">
      {AGENTS.map((agent, i) => {
        const state = agentStates[i] ?? 'waiting'
        const agentNum = i + 1

        return (
          <div
            key={agent.label}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border transition-all duration-500',
              state === 'running' && 'border-purple-500/50 bg-purple-500/10',
              state === 'done' && 'border-green-500/30 bg-green-500/5',
              state === 'waiting' && 'border-white/5 bg-white/2 opacity-50'
            )}
          >
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg relative">
              {state === 'running' ? (
                <span className="animate-pulse">{agent.icon}</span>
              ) : state === 'done' ? (
                <span className="text-green-400">✅</span>
              ) : (
                <span className="opacity-40">{agent.icon}</span>
              )}
              {state === 'running' && (
                <span className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-30" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">#{agentNum}</span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    state === 'running' && 'text-purple-300',
                    state === 'done' && 'text-green-300',
                    state === 'waiting' && 'text-slate-500'
                  )}
                >
                  {agent.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{agent.desc}</p>
            </div>

            <div className="shrink-0">
              {state === 'running' && (
                <span className="text-xs text-purple-400 font-medium animate-pulse">
                  Procesando...
                </span>
              )}
              {state === 'done' && (
                <span className="text-xs text-green-400 font-medium">Completado</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
