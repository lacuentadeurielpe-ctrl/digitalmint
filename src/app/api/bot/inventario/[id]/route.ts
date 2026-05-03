import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getOwnedItem(itemId: string, userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('inventario_bot')
    .select('id')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const owned = await getOwnedItem(params.id, user.id)
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const campos: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('precio_venta'   in body) campos.precio_venta   = Number(body.precio_venta)
  if ('precio_tachado' in body) campos.precio_tachado = body.precio_tachado ? Number(body.precio_tachado) : null
  if ('enlace_entrega' in body) campos.enlace_entrega = body.enlace_entrega || null
  if ('multimedia_urls' in body) campos.multimedia_urls = body.multimedia_urls ?? []
  if ('prueba_social'  in body) campos.prueba_social  = body.prueba_social || null
  if ('escasez_texto'  in body) campos.escasez_texto  = body.escasez_texto || null
  if ('activo'         in body) campos.activo         = Boolean(body.activo)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inventario_bot')
    .update(campos)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const owned = await getOwnedItem(params.id, user.id)
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const admin = createAdminClient()
  await admin.from('inventario_bot').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
