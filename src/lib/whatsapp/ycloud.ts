async function ycloudFetch(path: string, body: Record<string, unknown>, apiKey: string) {
  await fetch(`https://api.ycloud.com/v2${path}`, {
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
