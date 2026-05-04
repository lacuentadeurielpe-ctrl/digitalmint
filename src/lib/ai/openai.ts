// Whisper (audio → texto) + GPT-4o-mini Vision (imagen → análisis de comprobante)
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
    console.error('[OpenAI] transcribirAudio:', e)
    return null
  }
}

// ── Imagen → Análisis de comprobante ─────────────────────────────────────────

export interface AnalisisComprobante {
  es_comprobante: boolean
  metodo: 'yape' | 'plin' | 'bcp' | 'bbva' | 'scotiabank' | 'interbank' | 'mercadopago' | 'paypal' | 'nequi' | 'daviplata' | 'transferencia' | 'otro' | null
  monto: number | null            // número puro (ej: 25, 1126.00)
  moneda: string | null           // 'PEN', 'USD', 'ARS', 'MXN', 'COP', 'CLP', 'BRL'
  numero_operacion: string | null // código único de la transacción
  destinatario_ultimos: string | null  // últimos 3-4 dígitos del número/cuenta destino
  destinatario_nombre: string | null   // nombre del destinatario si es visible
  fecha: string | null
  descripcion: string             // descripción breve para el cliente (en español)
}

export async function analizarImagen(
  buffer: Buffer,
  mimeType: string,
): Promise<AnalisisComprobante | null> {
  const apiKey = getKey()
  if (!apiKey) return null

  const base64 = buffer.toString('base64')
  const imageUrl = `data:${mimeType};base64,${base64}`

  const systemPrompt = `Analiza esta imagen y determina si es un comprobante de pago o transferencia de dinero.

MÉTODOS QUE DEBES RECONOCER (y sus claves visuales):
- yape: dice "¡Yapeaste!" o logo Yape morado. Muestra monto como "S/XX". Tiene "Nro. de operación" y "Código de seguridad". El "Nro. de celular" mostrado son los últimos 3 dígitos del EMISOR (no del destinatario). El destinatario aparece como nombre parcial tipo "Amanda Rod*".
- plin: dice "¡Plineaste!" o logo Plin. Muestra "Código de operación". El número del destinatario aparece parcialmente como "... 221 - Yape" (los últimos 3 dígitos del DESTINATARIO van en destinatario_ultimos).
- bcp: dice "¡Transferencia exitosa!" con logo BCP azul. Muestra cuenta destino con últimos 4 dígitos como "****2019". Campo "Número de operación".
- bbva: logo BBVA azul marino. Muestra "Número de constancia" o "Número de operación".
- scotiabank: logo Scotiabank rojo. Muestra "Número de autorización" o similar.
- interbank: logo Interbank verde. Muestra "Código de operación".
- mercadopago: logo MercadoPago azul. Puede ser en varias monedas.
- paypal: logo PayPal azul. Moneda generalmente USD.
- nequi: logo Nequi colombia. Moneda COP.
- daviplata: logo Daviplata colombia. Moneda COP.
- transferencia: cualquier transferencia bancaria sin app reconocida.

REGLAS DE EXTRACCIÓN:
1. monto: extrae solo el número. "S/25" → 25. "S/1,126.00" → 1126. "$25.50" → 25.5. Si aparece con comas de miles, quítalas.
2. moneda: infiere por el símbolo o contexto. "S/" → "PEN". "$" en Perú/Venezuela → "USD". "$" en Argentina → "ARS". "$" en México → "MXN". "R$" → "BRL". "COP$" o contexto colombiano → "COP". Si no puedes determinar → null.
3. numero_operacion: el código único más prominente de la transacción (el que sirve como recibo). Para Yape es "Nro. de operación". Para BCP es "Número de operación". Para Plin es "Código de operación".
4. destinatario_ultimos:
   - Para plin: los últimos 3 dígitos del número del destinatario (ej: "221" de "... 221 - Yape").
   - Para bcp/bbva/scotiabank/interbank: los últimos 4 dígitos de la cuenta destino (ej: "2019" de "****2019").
   - Para yape: NO hay dígitos del destinatario en el comprobante, pon null.
   - Para mercadopago/paypal: null usualmente.
5. destinatario_nombre: nombre del destinatario si aparece (parcial está bien). Para Yape: "Amanda Rod*" → "Amanda Rod*".
6. descripcion: mensaje corto y amigable en español para decirle al cliente que recibiste su comprobante.

Si la imagen NO es un comprobante de pago, pon es_comprobante: false y el resto null.

Responde SOLO JSON válido, sin markdown:
{
  "es_comprobante": true/false,
  "metodo": "yape"|"plin"|"bcp"|...|null,
  "monto": 25.00|null,
  "moneda": "PEN"|"USD"|null,
  "numero_operacion": "26101992"|null,
  "destinatario_ultimos": "321"|null,
  "destinatario_nombre": "Amanda Rod*"|null,
  "fecha": "17 dic. 2025 11:31 PM"|null,
  "descripcion": "Comprobante Yape de S/25 recibido"
}`

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
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
    if (!content) return null
    return JSON.parse(content) as AnalisisComprobante
  } catch (e) {
    console.error('[OpenAI] analizarImagen:', e)
    return null
  }
}
