import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { procesarMensaje } from '@/lib/bot/orquestador'
import { enviarTexto, enviarImagen } from '@/lib/whatsapp/ycloud'

export async function POST(req: Request) {
  let stage = 'init'
  try {
    const body = await req.json()
    const eventType = body?.type ?? ''
    const msg = body?.data

    // Log todo de una vez — Vercel MCP sólo muestra 1 línea por request
    console.log('[wh]', JSON.stringify({
      stage: 'recv',
      type: eventType,
      from: msg?.from,
      to: msg?.to,
      msgType: msg?.type,
      textBody: msg?.text?.body?.slice(0, 60),
      hasData: !!msg,
    }))

    const esInbound =
      eventType.includes('inbound') ||
      eventType.includes('message') ||
      (msg?.from && msg?.to)

    if (!msg || !esInbound) {
      console.log('[wh] ignorado tipo:', eventType)
      return NextResponse.json({ ok: true })
    }

    const clientePhone = String(msg.from ?? '').replace('+', '')
    const botPhone     = String(msg.to   ?? '').replace('+', '')
    const tipo         = String(msg.type ?? 'text')

    if (!clientePhone || !botPhone) {
      console.log('[wh] sin phones, from:', msg.from, 'to:', msg.to)
      return NextResponse.json({ ok: true })
    }

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
      console.log('[wh] sin contenido, tipo:', tipo)
      return NextResponse.json({ ok: true })
    }

    stage = 'db-settings'
    const admin = createAdminClient()

    const { data: settings, error: settingsErr } = await admin
      .from('user_settings')
      .select('user_id, ycloud_api_key, bot_activo')
      .eq('bot_phone', botPhone)
      .eq('bot_activo', true)
      .maybeSingle()

    console.log('[wh] settings lookup — botPhone:', botPhone, 'found:', !!settings, 'err:', settingsErr?.message ?? null)

    if (!settings) {
      return NextResponse.json({ ok: true })
    }

    const apiKey = (settings.ycloud_api_key as string | null) ?? process.env.YCLOUD_API_KEY ?? ''
    const botPhoneConPlus = `+${botPhone}`
    const clientePhoneConPlus = `+${clientePhone}`

    stage = 'orquestador'
    const resultado = await procesarMensaje({
      clientePhone: clientePhoneConPlus,
      botPhone: botPhoneConPlus,
      userId: settings.user_id as string,
      mensaje: texto,
      tipoMensaje: tipoNorm,
      imagenUrl,
    })

    if (!resultado) {
      console.log('[wh] sin respuesta (pausado)')
      return NextResponse.json({ ok: true })
    }

    stage = 'send'
    if (resultado.multimediaUrls?.length) {
      for (const url of resultado.multimediaUrls) {
        await enviarImagen({ to: clientePhoneConPlus, imageUrl: url, fromPhone: botPhoneConPlus, apiKey })
      }
    }

    await enviarTexto({ to: clientePhoneConPlus, text: resultado.respuesta, fromPhone: botPhoneConPlus, apiKey })
    console.log('[wh] OK enviado a', clientePhoneConPlus)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[wh] ERROR stage=' + stage, String(err))
    return NextResponse.json({ ok: true })
  }
}
