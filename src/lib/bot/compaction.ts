// Compaction de historial largo
//
// Cuando una conversación supera 15 mensajes, resumimos los viejos con DeepSeek
// (llamada barata) y guardamos el resumen en bot_conversations.resumen_contexto.
// La próxima vez el bot recibe: [resumen] + [últimos 8 mensajes] en lugar del historial completo.

import { createAdminClient } from '@/lib/supabase/admin'
import type { MensajeBot } from './tipos'

const UMBRAL   = 15
const RECIENTES = 8

export async function aplicarCompaction(params: {
  conversacionId: string
  historial: MensajeBot[]
  resumenPrevio: string | null
}): Promise<{ mensajesRecientes: MensajeBot[]; resumen: string | null }> {
  const { conversacionId, historial, resumenPrevio } = params

  if (historial.length < UMBRAL) {
    return { mensajesRecientes: historial, resumen: resumenPrevio }
  }

  const recientes = historial.slice(-RECIENTES)
  const aResumir  = historial.slice(0, -RECIENTES)

  try {
    const nuevoResumen = await generarResumen(aResumir, resumenPrevio)
    if (nuevoResumen) {
      const admin = createAdminClient()
      await admin
        .from('bot_conversations')
        .update({ resumen_contexto: nuevoResumen, updated_at: new Date().toISOString() })
        .eq('id', conversacionId)
      return { mensajesRecientes: recientes, resumen: nuevoResumen }
    }
  } catch (e) {
    console.error('[Compaction] falló, usando historial completo:', e)
  }

  return { mensajesRecientes: recientes, resumen: resumenPrevio }
}

async function generarResumen(
  mensajes: MensajeBot[],
  resumenPrevio: string | null,
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return null

  const transcript = mensajes
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`)
    .join('\n')

  const prompt = resumenPrevio
    ? `Tienes un resumen previo de una conversación de WhatsApp entre un cliente y un vendedor de productos digitales. Actualízalo con los nuevos mensajes. Máximo 5 viñetas. Incluye: producto de interés, objeciones expresadas, nombre si lo dijo, nivel de interés (frío/tibio/caliente), si ya pagó. No inventes nada.

Resumen previo:
${resumenPrevio}

Nuevos mensajes:
${transcript}`
    : `Resume esta conversación de WhatsApp entre un cliente y un vendedor de productos digitales. Máximo 5 viñetas. Incluye: producto de interés, objeciones expresadas, nombre si lo dijo, nivel de interés (frío/tibio/caliente), si ya pagó. No inventes nada.

Conversación:
${transcript}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 250,
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch {
    clearTimeout(timer)
    return null
  }
}
