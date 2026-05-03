import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatUSD } from '@/lib/utils'
import type { AvatarCliente, EstructuraProducto, EstrategiaPrecio, ProductStatus } from '@/lib/supabase/types'
import CopyButton from '@/components/productos/CopyButton'

type ProductRow = {
  id: string
  user_id: string
  nombre_producto: string | null
  subtitulo: string | null
  idea_original: string
  status: ProductStatus
  current_agent: number
  promesa_before: string | null
  promesa_after: string | null
  avatar_cliente: AvatarCliente | null
  estructura_producto: EstructuraProducto | null
  precio_sugerido: number | null
  estrategia_precio: EstrategiaPrecio | null
  pagina_ventas: string | null
  ganchos_redes: string[] | null
  created_at: string
}

export default async function ProductoDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!raw) notFound()
  const p = raw as unknown as ProductRow

  if (p.status !== 'complete') {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-white font-semibold">Este producto aún se está generando</p>
          <a href="/dashboard/productos" className="text-purple-400 text-sm hover:underline mt-2 block">
            ← Volver a mis productos
          </a>
        </div>
      </div>
    )
  }

  const avatar = p.avatar_cliente as AvatarCliente | null
  const estructura = p.estructura_producto as EstructuraProducto | null
  const precio = p.estrategia_precio as EstrategiaPrecio | null
  const ganchos = p.ganchos_redes as string[] | null

  return (
    <div className="p-8 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <a href="/dashboard/productos" className="text-sm text-slate-500 hover:text-slate-300 mb-4 block">
          ← Mis productos
        </a>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{p.nombre_producto}</h1>
            <p className="text-slate-400 mt-1">{p.subtitulo}</p>
          </div>
          {p.precio_sugerido && (
            <div className="text-right shrink-0">
              {precio?.precio_anchor && (
                <p className="text-slate-500 line-through text-sm">{formatUSD(precio.precio_anchor)}</p>
              )}
              <p className="text-2xl font-bold text-green-400">{formatUSD(p.precio_sugerido)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs de exportación */}
      <div className="flex gap-2 mb-8">
        <CopyButton text={p.pagina_ventas ?? ''} label="📋 Copiar página de ventas" />
      </div>

      {/* Transformación */}
      <Section title="🔄 Transformación prometida">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400 font-semibold uppercase mb-2">Antes</p>
            <p className="text-sm text-slate-300">{p.promesa_before}</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-xs text-green-400 font-semibold uppercase mb-2">Después</p>
            <p className="text-sm text-slate-300">{p.promesa_after}</p>
          </div>
        </div>
      </Section>

      {/* Avatar */}
      {avatar && (
        <Section title="👤 Avatar del cliente ideal">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Info label="Nombre ficticio" value={avatar.nombre_ficticio} />
              <Info label="Edad" value={avatar.edad} />
              <Info label="Ocupación" value={avatar.ocupacion} />
              <Info label="Ingresos" value={avatar.nivel_ingresos} />
              <Info label="Dónde vive online" value={avatar.donde_vive} />
            </div>
            <div className="space-y-3">
              <ListInfo label="Dolores" items={avatar.dolores} color="red" />
              <ListInfo label="Deseos" items={avatar.deseos} color="green" />
              <ListInfo label="Objeciones" items={avatar.objeciones} color="yellow" />
            </div>
          </div>
          {avatar.cita_directa && (
            <blockquote className="mt-4 px-4 py-3 border-l-2 border-purple-500 bg-purple-500/5 rounded-r-lg">
              <p className="text-sm text-slate-300 italic">"{avatar.cita_directa}"</p>
              <footer className="text-xs text-slate-500 mt-1">— {avatar.nombre_ficticio}</footer>
            </blockquote>
          )}
        </Section>
      )}

      {/* Estructura */}
      {estructura && (
        <Section title="📦 Estructura del producto">
          <p className="text-sm text-slate-400 mb-4">{estructura.tipo}</p>
          <div className="space-y-3">
            {estructura.modulos?.map((mod) => (
              <div key={mod.numero} className="p-4 bg-slate-800/50 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-purple-400 font-mono">Módulo {mod.numero}</span>
                  {mod.es_pareto && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                      ⭐ 80% del valor
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{mod.titulo}</h3>
                <p className="text-xs text-slate-400 mb-2">{mod.descripcion}</p>
                <p className="text-xs text-green-400">→ {mod.transformacion}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Ganchos para redes */}
      {ganchos && ganchos.length > 0 && (
        <Section title="📱 Ganchos para redes sociales">
          <div className="space-y-4">
            {ganchos.map((gancho, i) => (
              <div key={i} className="p-4 bg-slate-800/50 border border-white/5 rounded-xl relative group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-purple-400 font-semibold">
                    {['PAS (Problema→Agitación→Solución)', 'BAB (Antes→Después→Puente)', 'Hook contraintuitivo'][i]}
                  </span>
                  <CopyButton text={gancho} label="Copiar" small />
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{gancho}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Página de ventas */}
      {p.pagina_ventas && (
        <Section title="🏪 Página de ventas">
          <div className="flex justify-end mb-3">
            <CopyButton text={p.pagina_ventas} label="📋 Copiar todo" />
          </div>
          <div className="p-5 bg-slate-900 rounded-xl border border-white/5 text-sm text-slate-300 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {p.pagina_ventas}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-300">{value}</p>
    </div>
  )
}

function ListInfo({ label, items, color }: { label: string; items: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'text-red-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
  }
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className={`text-xs ${colorMap[color] ?? 'text-slate-300'}`}>• {item}</li>
        ))}
      </ul>
    </div>
  )
}

