import { createClient } from '@/lib/supabase/server'
import { formatUSD, formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: products }, { data: analytics }] = await Promise.all([
    supabase
      .from('products')
      .select('id, nombre_producto, status, precio_sugerido, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('product_analytics')
      .select('earnings_potential, exports')
      .eq('user_id', user!.id),
  ])

  const totalProducts = products?.length ?? 0
  const completeProducts = products?.filter(p => p.status === 'complete').length ?? 0
  const totalEarningsPotential = analytics?.reduce((sum, a) => sum + (a.earnings_potential ?? 0), 0) ?? 0
  const totalExports = analytics?.reduce((sum, a) => sum + a.exports, 0) ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Tu laboratorio de productos digitales</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Productos generados', value: totalProducts, icon: '📦', color: 'purple' },
          { label: 'Completados', value: completeProducts, icon: '✅', color: 'green' },
          { label: 'Potencial de ingresos', value: formatUSD(totalEarningsPotential), icon: '💰', color: 'yellow' },
          { label: 'Exports realizados', value: totalExports, icon: '📤', color: 'blue' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{kpi.label}</span>
              <span className="text-xl">{kpi.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Últimos productos */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Últimos productos</h2>
          <a href="/dashboard/productos" className="text-sm text-purple-400 hover:underline">
            Ver todos →
          </a>
        </div>

        {!products || products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">Aún no has generado ningún producto</p>
            <a
              href="/dashboard/productos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition"
            >
              ✨ Crear mi primer producto
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(p => (
              <a
                key={p.id}
                href={`/dashboard/productos/${p.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {p.nombre_producto ?? 'Generando...'}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {p.precio_sugerido && (
                    <span className="text-sm text-green-400">{formatUSD(p.precio_sugerido)}</span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pendiente', class: 'bg-slate-700 text-slate-300' },
    generating: { label: 'Generando', class: 'bg-yellow-500/20 text-yellow-300' },
    complete: { label: 'Completo', class: 'bg-green-500/20 text-green-300' },
    failed: { label: 'Error', class: 'bg-red-500/20 text-red-300' },
  }
  const { label, class: cls } = map[status] ?? map.pending
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  )
}
