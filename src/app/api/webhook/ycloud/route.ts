import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { procesarMensaje } from '@/lib/bot/orquestador'
import { enviarTexto, enviarImagen } from '@/lib/whatsapp/ycloud'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // YCloud envía el mensaje en body.data
    const msg = body?.data
    if (!msg || msg.flow !== 'inbound') {
      return NextResponse.json({ ok: true })
    }

    const clientePhone = msg.from as string   // quien escribe
    const botPhone     = msg.to   as string   // nuestro número
    const tipo         = (msg.type ?? 'text') as string

    if (!clientePhone || !botPhone) return NextResponse.json({ ok: true })

    // Extraer contenido según tipo
    let texto = ''
    let imagenUrl: string | undefined
    let tipoNorm: 'text' | 'image' | 'audio' | 'otro' = 'text'

    if (tipo === 'text') {
      texto = (msg.text?.body ?? msg.text ?? '') as string
      tipoNorm = 'text'
    } else if (tipo === 'image') {
      texto = msg.image?.caption ?? 'comprobante'
      imagenUrl = msg.image?.url ?? msg.image?.link
      tipoNorm = 'image'
    } else if (tipo === 'audio') {
      texto = '[audio]'
      tipoNorm = 'audio'
    } else {
      texto = msg.caption ?? '[archivo]'
      tipoNorm = 'otro'
    }

    if (!texto && !imagenUrl) return NextResponse.json({ ok: true })

    // Buscar usuario dueño de este número de bot
    const admin = createAdminClient()
    const botPhoneNorm = botPhone.replace('+', '')

    const { data: settings } = await admin
      .from('user_settings')
      .select('user_id, ycloud_api_key, bot_activo')
      .eq('bot_phone', botPhoneNorm)
      .eq('bot_activo', true)
      .maybeSingle()

    if (!settings) return NextResponse.json({ ok: true })

    const apiKey = (settings.ycloud_api_key as string | null) ?? process.env.YCLOUD_API_KEY ?? ''

    // Procesar con el orquestador multiagéntico
    const resultado = await procesarMensaje({
      clientePhone,
      botPhone,
      userId: settings.user_id as string,
      mensaje: texto,
      tipoMensaje: tipoNorm,
      imagenUrl,
    })

    if (!resultado) return NextResponse.json({ ok: true }) // conversación pausada

    // Enviar multimedia primero si hay
    if (resultado.multimediaUrls?.length) {
      for (const url of resultado.multimediaUrls) {
        await enviarImagen({ to: clientePhone, imageUrl: url, fromPhone: botPhone, apiKey })
      }
    }

    // Enviar respuesta de texto
    await enviarTexto({ to: clientePhone, text: resultado.respuesta, fromPhone: botPhone, apiKey })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/ycloud]', err)
    return NextResponse.json({ ok: true }) // siempre 200 para YCloud
  }
}
