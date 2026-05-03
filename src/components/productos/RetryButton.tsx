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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleRetry(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setRunning(true)
    setErr('')
    setProgress(0)
    try {
      for (let agente = 1; agente <= 4; agente++) {
        setProgress(agente - 1)
        await runAgente(productId, agente)
        setProgress(agente)
      }
      for (let agente = 5; agente <= 7; agente++) {
        setProgress(agente - 1)
        try { await runAgente(productId, agente) } catch {}
        setProgress(agente)
      }
      router.push(`/dashboard/productos/${productId}`)
      router.refresh()
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Error')
      setRunning(false)
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    try {
      await fetch(`/api/productos/${productId}`, { method: 'DELETE' })
      router.push('/dashboard/productos')
      router.refresh()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (running) {
    return (
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-yellow-400">
          <span className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          Agente {progress + 1}/7 ejecutándose...
        </div>
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${(progress / 7) * 100}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {err && <p className="text-xs text-red-400 truncate">{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleRetry}
          className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 transition font-medium"
        >
          🔄 Reintentar
        </button>

        {!confirmDelete ? (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true) }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-500 hover:border-red-500/40 hover:text-red-400 transition"
          >
            🗑
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition font-medium disabled:opacity-50"
            >
              {deleting
                ? <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block" />
                : 'Eliminar'}
            </button>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
