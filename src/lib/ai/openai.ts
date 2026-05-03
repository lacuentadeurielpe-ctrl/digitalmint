// Whisper (audio → texto) + GPT-4o-mini Vision (imagen → análisis)
// Solo activo si OPENAI_API_KEY está configurado

const OPENAI_BASE = 'https://api.openai.com/v1'

function getKey(): string | null {
  return process.env.OPENAI_API_KEY ?? null
}

export function openAIDisponible(): boolean {
  return !!getKey()
}

// ── Audio → Texto (Whisper) ──────────────────────────────────────────────────

export async function transcribirAudio(
  buffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  const apiKey = getKey()
  if (!apiKey) return null

  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a'
    : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3'
    : mimeType.includes('webm') ? 'webm'
    : mimeType.includes('wav') ? 'wav'
    : 'ogg'

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), `audio.${ext}`)
  form.append('model', 'whisper-1')
  form.append('language', 'es')
  form.append('response_format', 'text')

  try {
    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    if (!res.ok) {
      console.error('[OpenAI] Whisper error:', res.status, await res.text())
      return null
    }
    return (await res.text()).trim() || null
  } catch (e) {
    console.error('[OpenAI] transcribirAudio excepción:', e)
    return null
  }
}

// ── Imagen → Análisis (GPT-4o-mini Vision) ────────────────────────────────────

export interface AnalisisImagen {
  tipo: 'comprobante_pago' | 'otro'
  descripcion: string
  pago?: {
    monto: number | null
    destinatario: string | null
    numero_operacion: string | null
    metodo: string | null   // 'yape' | 'plin' | 'bcp' | 'transferencia' | null
    fecha: string | null
  }
}

export async function analizarImagen(
  buffer: Buffer,
  mimeType: string,
): Promise<AnalisisImagen | null> {
  const apiKey = getKey()
  if (!apiKey) return null

  const base64 = buffer.toString('base64')
  const imageUrl = `data:${mimeType};base64,${base64}`

  const systemPrompt = `Eres un asistente de ventas de productos digitales en Perú.
Analiza la imagen del cliente y determina si es un comprobante de pago (Yape, Plin, BCP, Interbank, BBVA, transferencia, depósito) o cualquier otra cosa.

Responde SOLO en JSON válido:
{
  "tipo": "comprobante_pago" | "otro",
  "descripcion": "descripción breve en español (máx 100 chars)",
  "pago": {
    "monto": 150.00,
    "destinatario": "nombre o número del destinatario",
    "numero_operacion": "código de operación o transacción",
    "metodo": "yape" | "plin" | "bcp" | "transferencia" | null,
    "fecha": "fecha tal como aparece en la imagen"
  }
}
El campo "pago" solo lo incluyes si tipo es "comprobante_pago". Usa null para campos que no puedas leer con certeza.`

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
              { type: 'text', text: 'Analiza esta imagen.' },
            ],
          },
        ],
      }),
    })
    if (!res.ok) {
      console.error('[OpenAI] Vision error:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    return content ? JSON.parse(content) as AnalisisImagen : null
  } catch (e) {
    console.error('[OpenAI] analizarImagen excepción:', e)
    return null
  }
}
