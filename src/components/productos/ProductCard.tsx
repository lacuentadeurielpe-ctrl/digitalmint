import Link from 'next/link'
import { formatUSD, formatDate } from '@/lib/utils'
import RetryButton from './RetryButton'

interface ProductCardProps {
  id: string
  nombre_producto: string | null
  subtitulo: string | null
  idea_original: string
  status: string
  precio_sugerido: number | null
  created_at: string
  current_agent: number
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pendiente',  cls: 'bg-slate-700 text-slate-300' },
  generating: { label: 'Generando', cls: 'bg-yellow-500/20 text-yellow-300' },
  complete:   { label: 'Listo',     cls: 'bg-green-500/20 text-green-300' },
  failed:     { label: 'Error',     cls: 'bg-red-500/20 text-red-300' },
}

const AGENT_LABELS = ['Pendiente', 'Investigando', 'Estrategia', 'Arquitecto', 'Escritores', 'Editor', 'Vendedor']

export default function ProductCard(props: ProductCardProps) {
  const { id, nombre_producto, subtitulo, idea_original, status, precio_sugerido, created_at, current_agent } = props
  const { label, cls } = STATUS_MAP[status] ?? STATUS_MAP.pending
  const isFailed = status === 'failed'

  const inner = (
    <div className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
      isFailed
        ? 'border-red-500/20 bg-red-900/5'
        : 'border-white/5 hover:border-purple-500/30 hover:bg-slate-800 group-hover:border-purple-500/30'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-white truncate transition-colors ${!isFailed ? 'group-hover:text-purple-300' : ''}`}>
            {nombre_producto ?? idea_original}
          </h3>
          {subtitulo && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitulo}</p>
          )}
          {!nombre_producto && nombre_producto === null && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">{idea_original}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cls}`}>
          {label}
        </span>
      </div>

      {status === 'generating' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{AGENT_LABELS[current_agent] ?? 'Procesando'}</span>
            <span>{current_agent}/6</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(current_agent / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isFailed && (
        <RetryButton productId={id} />
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
        <span>{formatDate(created_at)}</span>
        {precio_sugerido && (
          <span className="text-green-400 font-medium">{formatUSD(precio_sugerido)}</span>
        )}
      </div>
    </div>
  )

  if (isFailed) return <div>{inner}</div>

  return (
    <Link href={`/dashboard/productos/${id}`} className="block group">
      {inner}
    </Link>
  )
}
