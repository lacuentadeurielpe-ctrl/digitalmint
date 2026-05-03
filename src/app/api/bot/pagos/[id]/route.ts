import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTexto } from '@/lib/whatsapp/ycloud'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { accion, notas } = await req.json() as { accion: 'confirmar' | 'rechazar'; notas?: string }
  if (!['confirmar', 'rechazar'].includes(accion)) {
    return NextResponse.json({ error: 'accion inválida' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verificar propiedad
  const { data: pago } = await admin
    .from('pagos_pendientes')
    .select(`id, conversacion_id, inventario_id,
             bot_conversations(cliente_phone, nombre_cliente),
             inventario_bot(enlace_entrega, precio_venta, products(nombre_producto))`)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

  const nuevoEstado = accion === 'confirmar' ? 'confirmado' : 'rechazado'

  await admin
    .from('pagos_pendientes')
    .update({ estado: nuevoEstado, notas: notas ?? null, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  // Actualizar conversación
  const estadoConv = accion === 'confirmar' ? 'cliente' : 'cerrando'
  await admin
    .from('bot_conversations')
    .update({ estado: estadoConv, pausado: false, updated_at: new Date().toISOString() })
    .eq('id', pago.conversacion_id)

  if (accion === 'confirmar') {
    // Incrementar conversiones en inventario
    if (pago.inventario_id) {
      try {
        const { data: invItem } = await admin
          .from('inventario_bot').select('conversiones').eq('id', pago.inventario_id).single()
        if (invItem) {
          await admin
            .from('inventario_bot')
            .update({ conversiones: ((invItem as any).conversiones ?? 0) + 1 })
            .eq('id', pago.inventario_id)
        }
      } catch {}
    }

    // Enviar acceso al cliente vía WhatsApp
    const settings = await admin
      .from('user_settings')
      .select('ycloud_api_key, bot_phone')
      .eq('user_id', user.id)
      .single()

    const inv = pago.inventario_bot as any
    const conv = pago.bot_conversations as any
    const clientePhone = conv?.cliente_phone ? `+${conv.cliente_phone}` : null
    const enlace = inv?.enlace_entrega
    const nombreProd = (inv?.products as any)?.nombre_producto ?? 'tu producto'
    const nombreCliente = conv?.nombre_cliente ? ` ${conv.nombre_cliente}` : ''

    if (clientePhone && settings.data) {
      const s = settings.data as any
      const apiKey = s.ycloud_api_key ?? process.env.YCLOUD_API_KEY ?? ''
      const botPhone = s.bot_phone ? `+${s.bot_phone}` : ''

      const msg = enlace
        ? `🎉 ¡Tu pago fue confirmado${nombreCliente}!\n\nAquí tienes tu acceso a *${nombreProd}*:\n${enlace}\n\n¡Bienvenido! Cualquier duda estoy aquí. 💪`
        : `🎉 ¡Tu pago fue confirmado${nombreCliente}! El equipo te enviará el acceso a *${nombreProd}* en breve. ¡Gracias por tu confianza! 💜`

      await enviarTexto({ to: clientePhone, text: msg, fromPhone: botPhone, apiKey })
    }
  }

  return NextResponse.json({ ok: true })
}
