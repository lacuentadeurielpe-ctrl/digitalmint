import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado') ?? 'pendiente'

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pagos_pendientes')
    .select(`id, monto, metodo, numero_operacion, comprobante_url, estado, notas, created_at,
             conversacion_id, inventario_id,
             bot_conversations(cliente_phone, nombre_cliente),
             inventario_bot(precio_venta, products(nombre_producto))`)
    .eq('user_id', user.id)
    .eq('estado', estado)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
