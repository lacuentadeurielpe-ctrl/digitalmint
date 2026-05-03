import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import InventarioClient from '@/components/bot/InventarioClient'

export default async function InventarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const [invRes, prodRes] = await Promise.all([
    admin
      .from('inventario_bot')
      .select(`id, precio_venta, precio_tachado, enlace_entrega, multimedia_urls,
               prueba_social, escasez_texto, activo, leads, conversiones,
               products(id, nombre_producto, subtitulo, tipo_producto, precio_sugerido, status)`)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),

    admin
      .from('products')
      .select('id, nombre_producto, subtitulo, tipo_producto, precio_sugerido')
      .eq('user_id', user!.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false }),
  ])

  const items = (invRes.data ?? []) as any[]
  const productos = (prodRes.data ?? []) as any[]

  const totalLeads = items.reduce((s, i) => s + (i.leads ?? 0), 0)
  const totalVentas = items.reduce((s, i) => s + (i.conversiones ?? 0), 0)

  return (
    <div className="p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Inventario del Bot</h1>
        <p className="text-slate-400 text-sm">
          Activa tus productos para que el bot los venda automáticamente por WhatsApp.
        </p>
      </div>

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Productos activos', value: items.filter(i => i.activo).length, color: 'text-green-400' },
            { label: 'Leads generados', value: totalLeads, color: 'text-purple-400' },
            { label: 'Ventas confirmadas', value: totalVentas, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="p-4 bg-slate-800/50 border border-white/5 rounded-xl text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hint si no hay productos completos */}
      {productos.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-yellow-300 text-sm font-medium mb-1">⚠️ Necesitas productos completos</p>
          <p className="text-slate-400 text-xs">
            Genera tu primer producto digital con IA para poder activarlo aquí.{' '}
            <a href="/dashboard/productos/nuevo" className="text-purple-400 underline">Crear producto →</a>
          </p>
        </div>
      )}

      <InventarioClient items={items} productosDisponibles={productos} />
    </div>
  )
}
