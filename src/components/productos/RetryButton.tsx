'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
}

async function runAgente(productId: string, agente: number) {
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

export default function RetryButton({ productId }: Props) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState('')

  async function handleRetry(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setRunning(true)
    setErr('')
    setProgress(0)
    try {
      // Agents 1-4 are critical (must succeed)
      for (let agente = 1; agente <= 4; agente++) {
        setProgress(agente - 1)
        await runAgente(productId, agente)
        setProgress(agente)
      }
      // Agents 5 and 6 are optional bonuses — failure is not fatal
      for (let agente = 5; agente <= 6; agente++) {
        setProgress(agente - 1)
        try {
          await runAgente(productId, agente)
        } catch (bonusErr) {
          console.warn(`Agente ${agente} (bonus) falló pero el producto está completo:`, bonusErr)
        }
        setProgress(agente)
      }
      router.push(`/dashboard/productos/${productId}`)
      router.refresh()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error'
      setErr(msg)
      setRunning(false)
    }
  }

  if (running) {
    return (
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-yellow-400">
          <span className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          Agente {progress + 1}/6 ejecutándose...
        </div>
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${(progress / 6) * 100}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3">
      {err && <p className="text-xs text-red-400 mb-1 truncate">{err}</p>}
      <button
        onClick={handleRetry}
        className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 transition font-medium"
      >
        🔄 Reintentar generación
      </button>
    </div>
  )
}
