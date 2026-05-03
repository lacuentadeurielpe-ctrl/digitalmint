import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inventario_bot')
    .select(`id, precio_venta, precio_tachado, enlace_entrega, multimedia_urls,
             prueba_social, escasez_texto, activo, leads, conversiones, created_at,
             products(id, nombre_producto, subtitulo, tipo_producto, precio_sugerido, status)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { product_id, precio_venta, precio_tachado, enlace_entrega,
          multimedia_urls, prueba_social, escasez_texto } = body

  if (!product_id || !precio_venta) {
    return NextResponse.json({ error: 'product_id y precio_venta son requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar que el producto pertenece al usuario
  const { data: prod } = await admin
    .from('products')
    .select('id')
    .eq('id', product_id)
    .eq('user_id', user.id)
    .eq('status', 'complete')
    .single()

  if (!prod) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  // Verificar que no exista ya en el inventario
  const { data: existe } = await admin
    .from('inventario_bot')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .maybeSingle()

  if (existe) return NextResponse.json({ error: 'Este producto ya está en el inventario' }, { status: 409 })

  const { data, error } = await admin
    .from('inventario_bot')
    .insert({
      user_id: user.id,
      product_id,
      precio_venta: Number(precio_venta),
      precio_tachado: precio_tachado ? Number(precio_tachado) : null,
      enlace_entrega: enlace_entrega || null,
      multimedia_urls: multimedia_urls ?? [],
      prueba_social: prueba_social || null,
      escasez_texto: escasez_texto || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
