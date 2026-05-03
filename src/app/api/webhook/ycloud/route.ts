import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = createAdminClient()

  // Verificar que es un mensaje entrante de WhatsApp
  const message = body?.data
  if (!message || message.flow !== 'inbound') {
    return NextResponse.json({ ok: true })
  }

  const from = message.from as string
  const text = (message.text?.body ?? message.text ?? '') as string

  if (!from || !text.trim()) {
    return NextResponse.json({ ok: true })
  }

  // Buscar qué ferretería/usuario tiene este número configurado
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id, ycloud_api_key, bot_activo')
    .eq('bot_phone', from.replace('+', ''))
    .eq('bot_activo', true)
    .single()

  // Si no hay usuario con este número o el bot está inactivo, ignorar
  if (!settings) {
    return NextResponse.json({ ok: true })
  }

  // Obtener historial de conversación
  const { data: conv } = await supabase
    .from('bot_conversations')
    .select('id, mensajes')
    .eq('user_id', settings.user_id)
    .eq('cliente_phone', from.replace('+', ''))
    .single()

  const historial = (conv?.mensajes ?? []) as Array<{ role: string; content: string }>

  // Obtener los productos completos del usuario para el contexto
  const { data: productos } = await supabase
    .from('products')
    .select('nombre_producto, subtitulo, precio_sugerido, promesa_before, promesa_after, ganchos_redes')
    .eq('user_id', settings.user_id)
    .eq('status', 'complete')
    .limit(5)

  const productosContext = productos?.map(p =>
    `- ${p.nombre_producto}: ${p.subtitulo} | Precio: $${p.precio_sugerido}`
  ).join('\n') ?? 'Sin productos disponibles'

  // Llamar a Claude para generar respuesta
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  type MsgRole = 'user' | 'assistant'
  const validRoles: MsgRole[] = ['user', 'assistant']
  const messages = [
    ...historial
      .filter(m => validRoles.includes(m.role as MsgRole))
      .slice(-10)
      .map(m => ({ role: m.role as MsgRole, content: m.content })),
    { role: 'user' as const, content: text },
  ]

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: `Eres un asistente de ventas amable y profesional para un creador de productos digitales. Tu trabajo es responder preguntas sobre los productos disponibles y ayudar a los clientes a tomar decisiones de compra.

PRODUCTOS DISPONIBLES:
${productosContext}

REGLAS:
- Sé breve y directo (máximo 3 oraciones por respuesta)
- Si preguntan por un producto específico, da detalles del precio y la transformación
- Si quieren comprar, diles que el link de compra se los enviará el equipo
- No inventes información que no esté en los productos
- Responde en español`,
    messages,
  })

  const replyText = (response.content[0] as { type: string; text: string }).text

  // Guardar conversación actualizada
  const newMensajes = [
    ...historial.slice(-20),
    { role: 'user', content: text },
    { role: 'assistant', content: replyText },
  ]

  if (conv?.id) {
    await supabase
      .from('bot_conversations')
      .update({ mensajes: newMensajes })
      .eq('id', conv.id)
  } else {
    await supabase.from('bot_conversations').insert({
      user_id: settings.user_id,
      cliente_phone: from.replace('+', ''),
      mensajes: newMensajes,
    })
  }

  // Enviar respuesta por WhatsApp vía YCloud
  const apiKey = settings.ycloud_api_key ?? process.env.YCLOUD_API_KEY
  await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      from: body.data?.to ?? '',
      to: from,
      type: 'text',
      text: { body: replyText },
    }),
  })

  return NextResponse.json({ ok: true })
}
