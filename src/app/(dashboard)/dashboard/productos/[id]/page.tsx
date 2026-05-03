import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { formatUSD } from '@/lib/utils'
import type { AvatarCliente, EstructuraProducto, EstrategiaPrecio, ProductStatus } from '@/lib/supabase/types'
import CopyButton from '@/components/productos/CopyButton'
import ExportButtons from '@/components/productos/ExportButtons'
import DeleteProductButton from '@/components/productos/DeleteProductButton'

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
  estratega_output: { titulos_alternativos?: string[] } | null
  ganchos_redes: string[] | null
  vendedor_output: Record<string, unknown> | null
  tipo_producto: string | null
  tamano_total_palabras: number | null
  created_at: string
}

type ContenidoRow = {
  id: string
  orden: number
  tipo_seccion: string
  titulo: string
  contenido: string
  palabras_count: number
}

type VendedorUI = {
  guion_apertura_whatsapp?: string
  guion_presentacion_producto?: string
  guion_cierre?: string
  mensaje_entrega?: string
  respuestas_objeciones?: Array<{ objecion: string; respuesta: string }>
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
  const admin = createAdminClient()

  if (p.status !== 'complete') {
    const isStuck = p.status === 'generating'
    if (isStuck) {
      await admin.from('products').update({ status: 'failed' }).eq('id', p.id)
    }
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-4xl mb-3">{isStuck ? '⚠️' : '❌'}</div>
          <p className="text-white font-semibold">
            {isStuck ? 'La generación se interrumpió' : 'Este producto falló'}
          </p>
          <p className="text-slate-400 text-sm mt-1 mb-3">
            {isStuck ? 'Ya puedes reintentarlo desde Mis Productos.' : 'Usa Reintentar generación desde la lista.'}
          </p>
          <a
            href="/dashboard/productos"
            className="inline-block px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition text-sm font-medium"
          >
            ← Ir a Mis Productos y reintentar
          </a>
        </div>
      </div>
    )
  }

  // Fetch product content sections
  const { data: contenido } = await admin
    .from('producto_contenido')
    .select('id, orden, tipo_seccion, titulo, contenido, palabras_count')
    .eq('product_id', p.id)
    .order('orden', { ascending: true })

  const secciones = (contenido ?? []) as ContenidoRow[]

  const avatar = p.avatar_cliente as AvatarCliente | null
  const estructura = p.estructura_producto as EstructuraProducto | null
  const precio = p.estrategia_precio as EstrategiaPrecio | null
  const ganchos = p.ganchos_redes as string[] | null
  const vendedor = p.vendedor_output as VendedorUI | null
  const estrategaOutput = p.estratega_output
  const titulosOpciones = [
    p.nombre_producto,
    ...(estrategaOutput?.titulos_alternativos ?? []),
  ].filter((t): t is string => !!t)

  const totalPalabras = p.tamano_total_palabras
    ?? secciones.reduce((sum, s) => sum + (s.palabras_count ?? 0), 0)

  return (
    <div className="p-8 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <a href="/dashboard/productos" className="text-sm text-slate-500 hover:text-slate-300 mb-4 block">
          ← Mis productos
        </a>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {p.tipo_producto && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium capitalize">
                  {p.tipo_producto}
                </span>
              )}
              {totalPalabras > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                  {totalPalabras.toLocaleString()} palabras
                </span>
              )}
            </div>
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

      {/* Exportación */}
      <ExportButtons
        productId={p.id}
        isComplete={p.status === 'complete'}
        nombreProducto={p.nombre_producto ?? undefined}
        subtitulo={p.subtitulo}
        titulosOpciones={titulosOpciones}
      />

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

      {/* Contenido del producto */}
      {secciones.length > 0 && (
        <Section title={`📦 Contenido del producto (${secciones.length} secciones)`}>
          <div className="space-y-2">
            {secciones.map((sec) => (
              <details key={sec.id} className="group">
                <summary className="flex items-center justify-between p-4 bg-slate-800/50 border border-white/5 rounded-xl cursor-pointer hover:border-purple-500/30 transition list-none">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 w-6 shrink-0">
                      {sec.tipo_seccion === 'toc' ? '📋' :
                       sec.tipo_seccion === 'intro' ? '👋' :
                       sec.tipo_seccion === 'conclusion' ? '🏁' :
                       sec.tipo_seccion === 'bonus' ? '🎁' : `${sec.orden}.`}
                    </span>
                    <span className="text-sm font-semibold text-white group-open:text-purple-300 transition">
                      {sec.titulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">{sec.palabras_count?.toLocaleString()} palabras</span>
                    <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                  </div>
                </summary>
                <div className="mt-1 mb-3 p-5 bg-slate-900/60 rounded-xl border border-white/5 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {sec.contenido}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

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
        <Section title="🗺️ Estructura del producto">
          <p className="text-sm text-slate-400 mb-4">{estructura.tipo}</p>
          <div className="space-y-3">
            {estructura.modulos?.map((mod) => (
              <div key={mod.numero} className="p-4 bg-slate-800/50 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-purple-400 font-mono">#{mod.numero}</span>
                  {mod.es_pareto && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                      ⭐ Núcleo Pareto
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

      {/* Scripts WhatsApp */}
      {vendedor && (
        <Section title="💬 Scripts de ventas WhatsApp">
          {vendedor.guion_apertura_whatsapp && (
            <ScriptCard
              label="Apertura — primer mensaje al lead"
              content={vendedor.guion_apertura_whatsapp as string}
            />
          )}
          {vendedor.guion_presentacion_producto && (
            <ScriptCard
              label="Presentación del producto"
              content={vendedor.guion_presentacion_producto as string}
            />
          )}
          {vendedor.guion_cierre && (
            <ScriptCard
              label="Cierre — cuando muestra interés"
              content={vendedor.guion_cierre as string}
            />
          )}
          {vendedor.mensaje_entrega && (
            <ScriptCard
              label="Mensaje de entrega post-pago"
              content={vendedor.mensaje_entrega as string}
            />
          )}

          {(vendedor.respuestas_objeciones?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Manejo de objeciones</p>
              <div className="space-y-3">
                {vendedor.respuestas_objeciones!.map((obj, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-white/5 rounded-xl">
                    <p className="text-xs text-yellow-400 font-semibold mb-1">❝ {obj.objecion}</p>
                    <p className="text-xs text-slate-300">{obj.respuesta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Ganchos Facebook */}
      {ganchos && ganchos.length > 0 && (
        <Section title="📱 Ganchos para Facebook Ads">
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

      {/* Danger zone */}
      <div className="mt-12 pt-6 border-t border-white/5">
        <DeleteProductButton productId={p.id} />
      </div>
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

function ScriptCard({ label, content }: { label: string; content: string }) {
  return (
    <div className="mb-4 p-4 bg-slate-800/50 border border-white/5 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <CopyButton text={content} label="Copiar" small />
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{content}</p>
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
