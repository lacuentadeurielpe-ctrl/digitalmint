import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { plataforma } = await req.json() as { plataforma: 'gumroad' | 'hotmart' | 'stripe' | 'custom' }

  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).eq('user_id', user.id).single(),
    supabase.from('user_settings').select('webhook_gumroad, webhook_hotmart, webhook_stripe, webhook_custom').eq('user_id', user.id).single(),
  ])

  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const webhookUrl = (settings as any)?.[`webhook_${plataforma}`]
  if (!webhookUrl) {
    return NextResponse.json({ error: `No tienes configurado el webhook de ${plataforma}` }, { status: 400 })
  }

  const p = product as any
  const payload = {
    evento: 'producto_listo',
    timestamp: new Date().toISOString(),
    fuente: 'digitalmint',
    producto: {
      id: p.id,
      nombre: p.nombre_producto,
      subtitulo: p.subtitulo,
      precio: p.precio_sugerido,
      precio_anchor: p.estrategia_precio?.precio_anchor,
      promesa_before: p.promesa_before,
      promesa_after: p.promesa_after,
      tipo: p.estructura_producto?.tipo,
      pagina_ventas_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/productos/${p.id}`,
    },
  }

  const webhookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'DigitalMint/1.0' },
    body: JSON.stringify(payload),
  })

  // Registrar export
  const admin = createAdminClient()
  await admin.from('product_exports').insert({
    product_id: p.id,
    user_id: user.id,
    tipo: `webhook_${plataforma}`,
  })

  if (!webhookRes.ok) {
    return NextResponse.json({ error: `El webhook de ${plataforma} respondió con error ${webhookRes.status}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, plataforma, status: webhookRes.status })
}
