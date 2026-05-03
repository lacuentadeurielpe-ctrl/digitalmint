import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { procesarMensaje } from '@/lib/bot/orquestador'
import { enviarTexto, enviarImagen } from '@/lib/whatsapp/ycloud'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('[webhook] payload:', JSON.stringify(body).slice(0, 500))

    // YCloud envía: body.type = "whatsapp.inbound_message.received"
    // body.data contiene el mensaje
    const eventType = body?.type ?? ''
    const msg = body?.data

    // Solo procesar mensajes entrantes de WhatsApp
    // Aceptamos si el type incluye 'inbound' O si body.data tiene 'from' y 'to'
    const esInbound =
      eventType.includes('inbound') ||
      eventType.includes('message') ||
      (msg?.from && msg?.to)

    if (!msg || !esInbound) {
      console.log('[webhook] ignorado — tipo:', eventType)
      return NextResponse.json({ ok: true })
    }

    // Normalizar teléfonos (quitar + si viene)
    const clientePhone = String(msg.from ?? '').replace('+', '')
    const botPhone     = String(msg.to   ?? '').replace('+', '')
    const tipo         = String(msg.type ?? 'text')

    console.log('[webhook] de:', clientePhone, '→ bot:', botPhone, 'tipo:', tipo)

    if (!clientePhone || !botPhone) return NextResponse.json({ ok: true })

    // Extraer contenido según tipo de mensaje
    let texto = ''
    let imagenUrl: string | undefined
    let tipoNorm: 'text' | 'image' | 'audio' | 'otro' = 'text'

    if (tipo === 'text') {
      texto = String(msg.text?.body ?? msg.text ?? '')
      tipoNorm = 'text'
    } else if (tipo === 'image') {
      texto = msg.image?.caption ?? 'comprobante'
      imagenUrl = msg.image?.url ?? msg.image?.link ?? msg.image?.id
      tipoNorm = 'image'
    } else if (tipo === 'audio' || tipo === 'voice') {
      texto = '[audio]'
      tipoNorm = 'audio'
    } else {
      texto = msg.caption ?? msg.text?.body ?? '[archivo]'
      tipoNorm = 'otro'
    }

    if (!texto && !imagenUrl) {
      console.log('[webhook] sin contenido extraíble')
      return NextResponse.json({ ok: true })
    }

    console.log('[webhook] texto:', texto.slice(0, 100))

    // Buscar usuario dueño de este número de bot
    const admin = createAdminClient()

    const { data: settings } = await admin
      .from('user_settings')
      .select('user_id, ycloud_api_key, bot_activo')
      .eq('bot_phone', botPhone)
      .eq('bot_activo', true)
      .maybeSingle()

    if (!settings) {
      console.log('[webhook] no se encontró usuario con bot_phone:', botPhone)
      return NextResponse.json({ ok: true })
    }

    const apiKey = (settings.ycloud_api_key as string | null) ?? process.env.YCLOUD_API_KEY ?? ''
    const botPhoneConPlus = `+${botPhone}`
    const clientePhoneConPlus = `+${clientePhone}`

    // Procesar con el orquestador multiagéntico
    const resultado = await procesarMensaje({
      clientePhone: clientePhoneConPlus,
      botPhone: botPhoneConPlus,
      userId: settings.user_id as string,
      mensaje: texto,
      tipoMensaje: tipoNorm,
      imagenUrl,
    })

    if (!resultado) {
      console.log('[webhook] conversación pausada, sin respuesta')
      return NextResponse.json({ ok: true })
    }

    console.log('[webhook] respuesta generada:', resultado.respuesta.slice(0, 100))

    // Enviar multimedia primero si hay
    if (resultado.multimediaUrls?.length) {
      for (const url of resultado.multimediaUrls) {
        await enviarImagen({ to: clientePhoneConPlus, imageUrl: url, fromPhone: botPhoneConPlus, apiKey })
      }
    }

    // Enviar respuesta de texto
    await enviarTexto({ to: clientePhoneConPlus, text: resultado.respuesta, fromPhone: botPhoneConPlus, apiKey })

    console.log('[webhook] mensaje enviado OK')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/ycloud] error:', err)
    return NextResponse.json({ ok: true })
  }
}
