const YCLOUD_BASE = 'https://api.ycloud.com/v2'

async function ycloudFetch(path: string, body: Record<string, unknown>, apiKey: string) {
  await fetch(`${YCLOUD_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(body),
  })
}

export async function enviarTexto(params: {
  to: string
  text: string
  fromPhone: string
  apiKey: string
}) {
  await ycloudFetch('/whatsapp/messages', {
    from: params.fromPhone,
    to: params.to,
    type: 'text',
    text: { body: params.text },
  }, params.apiKey)
}

export async function enviarImagen(params: {
  to: string
  imageUrl: string
  caption?: string
  fromPhone: string
  apiKey: string
}) {
  await ycloudFetch('/whatsapp/messages', {
    from: params.fromPhone,
    to: params.to,
    type: 'image',
    image: { link: params.imageUrl, caption: params.caption ?? '' },
  }, params.apiKey)
}

// ── Descarga de media desde YCloud ──────────────────────────────────────────

/**
 * Descarga audio o imagen desde YCloud.
 * Acepta URL directa (https://...) o media ID.
 * YCloud puede responder con JSON {url, mimeType} o binario directo.
 */
export async function descargarMedia(
  mediaId: string | null | undefined,
  apiKey?: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!mediaId) return null

  // URL directa
  if (mediaId.startsWith('https://') || mediaId.startsWith('http://')) {
    try {
      const res = await fetch(mediaId)
      if (!res.ok) return null
      const ct = res.headers.get('content-type') ?? 'application/octet-stream'
      return { buffer: Buffer.from(await res.arrayBuffer()), mimeType: ct.split(';')[0].trim() }
    } catch { return null }
  }

  const key = apiKey ?? process.env.YCLOUD_API_KEY
  if (!key) return null

  try {
    const res = await fetch(`${YCLOUD_BASE}/whatsapp/media/${mediaId}`, {
      headers: { 'X-API-Key': key },
    })
    if (!res.ok) {
      console.error('[YCloud] GET media error:', res.status)
      return null
    }

    const ct = res.headers.get('content-type') ?? ''

    // Respuesta binaria directa
    if (!ct.includes('json')) {
      return { buffer: Buffer.from(await res.arrayBuffer()), mimeType: ct.split(';')[0].trim() }
    }

    // Respuesta JSON con URL de descarga
    const json = await res.json()
    const downloadUrl: string = json.url ?? json.link
    const mimeType: string = json.mimeType ?? json.mime_type ?? 'application/octet-stream'

    if (!downloadUrl) return null

    const dlRes = await fetch(downloadUrl)
    if (!dlRes.ok) return null
    return { buffer: Buffer.from(await dlRes.arrayBuffer()), mimeType }
  } catch (e) {
    console.error('[YCloud] descargarMedia excepción:', e)
    return null
  }
}
