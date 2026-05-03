import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { procesarMensaje } from '@/lib/bot/orquestador'
import { enviarTexto, enviarImagen } from '@/lib/whatsapp/ycloud'

export async function POST(req: Request) {
  let stage = 'init'
  try {
    const body = await req.json()
    const eventType: string = body?.type ?? ''

    // YCloud anida el mensaje en data.whatsappInboundMessage (no en data directamente)
    const msg =
      body?.data?.whatsappInboundMessage ??
      body?.data?.whatsappMessage ??
      body?.whatsappInboundMessage ??
      body?.whatsappMessage ??
      null

    console.log('[wh]', JSON.stringify({
      type: eventType,
      from: msg?.from ?? null,
      to: msg?.to ?? null,
      msgType: msg?.type ?? null,
      text: msg?.text?.body?.slice(0, 40) ?? null,
      dataKeys: body?.data ? Object.keys(body.data) : [],
    }))

    // Solo procesar mensajes entrantes reales
    if (!eventType.includes('inbound') && !eventType.includes('message.received')) {
      console.log('[wh] ignorado tipo:', eventType)
      return NextResponse.json({ ok: true })
    }

    if (!msg) {
      console.log('[wh] sin mensaje extraíble, data keys:', body?.data ? Object.keys(body.data) : [])
      return NextResponse.json({ ok: true })
    }

    const clientePhone = String(msg.from ?? '').replace(/^\+/, '')
    const botPhone     = String(msg.to   ?? '').replace(/^\+/, '')
    const tipo         = String(msg.type ?? 'text')

    if (!clientePhone || !botPhone) {
      console.log('[wh] phones vacíos, from:', msg.from, 'to:', msg.to)
      return NextResponse.json({ ok: true })
    }

    // Extraer contenido según tipo
    let texto = ''
    let imagenUrl: string | undefined
    let tipoNorm: 'text' | 'image' | 'audio' | 'otro' = 'text'

    if (tipo === 'text') {
      texto = String(msg.text?.body ?? '').trim()
      tipoNorm = 'text'
    } else if (tipo === 'image') {
      const imgObj = (msg as any).image ?? {}
      texto = imgObj.caption ?? 'comprobante'
      imagenUrl = imgObj.link ?? imgObj.url ?? imgObj.id
      tipoNorm = 'image'
    } else if (tipo === 'audio' || tipo === 'voice') {
      texto = '[audio]'
      tipoNorm = 'audio'
    } else {
      texto = (msg as any).caption ?? msg.text?.body ?? '[archivo]'
      tipoNorm = 'otro'
    }

    if (!texto && !imagenUrl) {
      console.log('[wh] sin contenido, tipo:', tipo)
      return NextResponse.json({ ok: true })
    }

    stage = 'db'
    const admin = createAdminClient()

    const { data: settings, error: sErr } = await admin
      .from('user_settings')
      .select('user_id, ycloud_api_key, bot_activo')
      .eq('bot_phone', botPhone)
      .eq('bot_activo', true)
      .maybeSingle()

    console.log('[wh] settings botPhone=' + botPhone + ' found=' + !!settings + (sErr ? ' err=' + sErr.message : ''))

    if (!settings) return NextResponse.json({ ok: true })

    const apiKey = (settings.ycloud_api_key as string | null) ?? process.env.YCLOUD_API_KEY ?? ''
    const botPlus     = `+${botPhone}`
    const clientePlus = `+${clientePhone}`

    stage = 'orquestador'
    const resultado = await procesarMensaje({
      clientePhone: clientePlus,
      botPhone: botPlus,
      userId: settings.user_id as string,
      mensaje: texto,
      tipoMensaje: tipoNorm,
      imagenUrl,
    })

    if (!resultado) {
      console.log('[wh] pausado, sin respuesta')
      return NextResponse.json({ ok: true })
    }

    stage = 'send'
    if (resultado.multimediaUrls?.length) {
      for (const url of resultado.multimediaUrls) {
        await enviarImagen({ to: clientePlus, imageUrl: url, fromPhone: botPlus, apiKey })
      }
    }

    await enviarTexto({ to: clientePlus, text: resultado.respuesta, fromPhone: botPlus, apiKey })
    console.log('[wh] OK → ' + clientePlus + ' (' + resultado.respuesta.length + ' chars)')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[wh] ERROR stage=' + stage, String(err))
    return NextResponse.json({ ok: true })
  }
}
