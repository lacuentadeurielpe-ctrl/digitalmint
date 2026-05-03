'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')

  async function handleDelete() {
    setStep('deleting')
    try {
      const res = await fetch(`/api/productos/${productId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.push('/dashboard/productos')
      router.refresh()
    } catch {
      setStep('confirm')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="text-xs text-slate-600 hover:text-red-400 transition"
      >
        🗑 Eliminar este producto
      </button>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">¿Eliminar definitivamente? Esta acción no se puede deshacer.</p>
        <button
          onClick={handleDelete}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition font-medium shrink-0"
        >
          Sí, eliminar
        </button>
        <button
          onClick={() => setStep('idle')}
          className="text-xs text-slate-500 hover:text-slate-300 transition shrink-0"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="w-3 h-3 border border-slate-600 border-t-red-400 rounded-full animate-spin" />
      Eliminando...
    </div>
  )
}
