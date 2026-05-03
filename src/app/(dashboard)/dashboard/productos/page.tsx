import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/productos/ProductCard'
import Link from 'next/link'
import type { ProductStatus } from '@/lib/supabase/types'

type ProductListRow = {
  id: string
  nombre_producto: string | null
  subtitulo: string | null
  idea_original: string
  status: ProductStatus
  precio_sugerido: number | null
  created_at: string
  current_agent: number
}

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('products')
    .select('id, nombre_producto, subtitulo, idea_original, status, precio_sugerido, created_at, current_agent')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const products = (raw ?? []) as unknown as ProductListRow[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Productos</h1>
          <p className="text-slate-400 mt-1">{products.length} productos generados</p>
        </div>
        <Link
          href="/dashboard/productos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition"
        >
          ✨ Nuevo producto
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-white mb-2">Aún no tienes productos</h2>
          <p className="text-slate-400 mb-6 max-w-md">
            Describe una idea y la IA la convertirá en un producto digital completo y listo para vender en minutos.
          </p>
          <Link
            href="/dashboard/productos/nuevo"
            className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-500 transition"
          >
            ✨ Crear mi primer producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(p => (
            <ProductCard
              key={p.id}
              id={p.id}
              nombre_producto={p.nombre_producto}
              subtitulo={p.subtitulo}
              idea_original={p.idea_original}
              status={p.status}
              precio_sugerido={p.precio_sugerido}
              created_at={p.created_at}
              current_agent={p.current_agent}
            />
          ))}
        </div>
      )}
    </div>
  )
}
