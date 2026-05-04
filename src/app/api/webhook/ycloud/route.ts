import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { procesarMensaje } from '@/lib/bot/orquestador'
import { procesarPagoDigital } from '@/lib/bot/pago-auto'
import { enviarTexto, enviarImagen, descargarMedia } from '@/lib/whatsapp/ycloud'
import { transcribirAudio, analizarImagen, openAIDisponible } from '@/lib/ai/openai'

export const maxDuration = 60

export async function POST(req: Request) {
  let stage = 'init'
  try {
    const body = await req.json()
    const eventType: string = body?.type ?? ''

    // YCloud anida el mensaje en data.whatsappInboundMessage
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

    if (!eventType.includes('inbound') && !eventType.includes('message.received')) {
      return NextResponse.json({ ok: true })
    }

    if (!msg) {
      console.log('[wh] sin mensaje extraíble')
      return NextResponse.json({ ok: true })
    }

    const clientePhone = String(msg.from ?? '').replace(/^\+/, '')
    const botPhone     = String(msg.to   ?? '').replace(/^\+/, '')
    const tipo         = String(msg.type ?? 'text')

    if (!clientePhone || !botPhone) {
      console.log('[wh] phones vacíos from:', msg.from, 'to:', msg.to)
      return NextResponse.json({ ok: true })
    }

    stage = 'db'
    const admin = createAdminClient()

    const { data: settings } = await admin
      .from('user_settings')
      .select('user_id, ycloud_api_key, bot_activo, yape_numero, plin_numero, bcp_cuenta, bbva_cuenta, interbank_cuenta, mercadopago_link, paypal_link, simbolo_moneda, moneda')
      .eq('bot_phone', botPhone)
      .eq('bot_activo', true)
      .maybeSingle()

    console.log('[wh] settings botPhone=' + botPhone + ' found=' + !!settings)
    if (!settings) return NextResponse.json({ ok: true })

    const s           = settings as any
    const apiKey      = (s.ycloud_api_key as string | null) ?? process.env.YCLOUD_API_KEY ?? ''
    const botPlus     = `+${botPhone}`
    const clientePlus = `+${clientePhone}`
    const userId      = s.user_id as string
    const configPagos = {
      yape_numero:      s.yape_numero,
      plin_numero:      s.plin_numero,
      bcp_cuenta:       s.bcp_cuenta,
      bbva_cuenta:      s.bbva_cuenta,
      interbank_cuenta: s.interbank_cuenta,
      mercadopago_link: s.mercadopago_link,
      paypal_link:      s.paypal_link,
      simbolo_moneda:   s.simbolo_moneda ?? 'S/',
      moneda:           s.moneda ?? 'PEN',
    }

    // ── Procesar según tipo de mensaje ────────────────────────────────────────
    stage = 'media'
    let texto = ''
    let imagenUrl: string | undefined
    let tipoNorm: 'text' | 'image' | 'audio' | 'otro' = 'text'

    if (tipo === 'text') {
      texto = String(msg.text?.body ?? '').trim()
      tipoNorm = 'text'

    } else if (tipo === 'audio' || tipo === 'voice') {
      const audioObj: Record<string, unknown> = (msg as any).audio ?? (msg as any).voice ?? {}
      const mediaId = (audioObj.link as string) ?? (audioObj.url as string) ?? (audioObj.id as string) ?? null

      if (openAIDisponible() && mediaId) {
        const media = await descargarMedia(mediaId, apiKey)
        if (media) {
          const mimeType = (audioObj.mimeType as string) ?? (audioObj.mime_type as string) ?? media.mimeType
          const transcripcion = await transcribirAudio(media.buffer, mimeType)
          if (transcripcion) {
            console.log('[wh] audio→texto:', transcripcion.slice(0, 60))
            texto = transcripcion
            tipoNorm = 'text'
          }
        }
      }

      if (!texto) {
        await enviarTexto({
          to: clientePlus,
          text: '🎧 Recibí tu nota de voz. Escríbeme tu consulta y te respondo enseguida 🙌',
          fromPhone: botPlus,
          apiKey,
        })
        return NextResponse.json({ ok: true })
      }

    } else if (tipo === 'image') {
      const imgObj: Record<string, unknown> = (msg as any).image ?? {}
      const mediaId = (imgObj.link as string) ?? (imgObj.url as string) ?? (imgObj.id as string) ?? null
      const caption  = ((imgObj.caption as string) ?? '').trim()

      if (openAIDisponible() && mediaId) {
        const media = await descargarMedia(mediaId, apiKey)
        if (media) {
          const analisis = await analizarImagen(media.buffer, media.mimeType)
          console.log('[wh] Vision es_comprobante=' + analisis?.es_comprobante + ' metodo=' + analisis?.metodo + ' monto=' + analisis?.monto)

          if (analisis?.es_comprobante) {
            // ── Auto-confirmar pago ─────────────────────────────────────────
            stage = 'pago'
            const resultado = await procesarPagoDigital({
              userId,
              clientePhone: clientePlus,
              botPhone: botPlus,
              apiKey,
              configPagos,
              datos: {
                monto: analisis.monto,
                moneda: analisis.moneda,
                metodo: analisis.metodo,
                numero_operacion: analisis.numero_operacion,
                destinatario_ultimos: analisis.destinatario_ultimos,
                destinatario_nombre: analisis.destinatario_nombre,
                comprobante_url: mediaId.startsWith('http') ? mediaId : null,
              },
            })

            console.log('[wh] pago ' + resultado.estado)

            if (resultado.estado !== 'confirmado_auto') {
              await enviarTexto({ to: clientePlus, text: resultado.mensajeCliente, fromPhone: botPlus, apiKey })
            }
            return NextResponse.json({ ok: true })
          }

          // Imagen que no es comprobante → pasar al agente como descripción
          texto = caption || analisis?.descripcion || 'imagen enviada'
          imagenUrl = mediaId.startsWith('http') ? mediaId : undefined
          tipoNorm = 'image'
        }
      } else {
        // Sin Vision: si hay caption úsalo, si no responde genérico
        if (caption) {
          texto = caption
          tipoNorm = 'text'
        } else {
          await enviarTexto({
            to: clientePlus,
            text: '📷 Vi tu foto. Cuéntame qué necesitas y te ayudo 🙌',
            fromPhone: botPlus,
            apiKey,
          })
          return NextResponse.json({ ok: true })
        }
      }

      if (!texto && !imagenUrl) return NextResponse.json({ ok: true })

    } else if (['sticker', 'reaction', 'unsupported'].includes(tipo)) {
      return NextResponse.json({ ok: true })

    } else {
      texto = (msg as any).caption ?? msg.text?.body ?? '[archivo]'
      tipoNorm = 'otro'
    }

    if (!texto && !imagenUrl) return NextResponse.json({ ok: true })

    // ── Pasar al orquestador ──────────────────────────────────────────────────
    stage = 'orquestador'
    const resultado = await procesarMensaje({
      clientePhone: clientePlus,
      botPhone: botPlus,
      userId,
      mensaje: texto,
      tipoMensaje: tipoNorm,
      imagenUrl,
    })

    if (!resultado || !resultado.respuesta) {
      console.log('[wh] sin respuesta')
      return NextResponse.json({ ok: true })
    }

    stage = 'send'
    if (resultado.multimediaUrls?.length) {
      for (const url of resultado.multimediaUrls) {
        await enviarImagen({ to: clientePlus, imageUrl: url, fromPhone: botPlus, apiKey })
      }
    }

    await enviarTexto({ to: clientePlus, text: resultado.respuesta, fromPhone: botPlus, apiKey })
    console.log('[wh] OK →', clientePlus, resultado.respuesta.length, 'chars')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[wh] ERROR stage=' + stage, String(err))
    return NextResponse.json({ ok: true })
  }
}
