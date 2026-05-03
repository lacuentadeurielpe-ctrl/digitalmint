import { deepseekText } from '@/lib/ai/deepseek'
import type { ContextoAgente, RespuestaAgente, EstadoConversacion } from './tipos'

const RE_INTERES = /\b(s[íi]|claro|me\s+interesa|cu[eé]ntame|c[oó]mo|quiero\s+saber|cu[aá]nto|precio|de\s+qu[eé]\s+trata|m[aá]s\s+info)\b/i
const RE_LISTO   = /\b(lo\s+quiero|lo\s+compro|dale|ok|vamos|perfecto|me\s+apunto|c[oó]mo\s+pago|quiero\s+comprarlo|me\s+interesa\s+comprarlo|comprar)\b/i
const RE_OBJECION = /\b(caro|mucho|no\s+tengo|pensarlo|despu[eé]s|luego|no\s+s[eé]|duda|tiempo|espera)\b/i

function siguienteEstado(actual: EstadoConversacion, mensaje: string): EstadoConversacion {
  if (actual === 'nuevo') return 'calificando'
  if (actual === 'calificando' && RE_INTERES.test(mensaje)) return 'presentando'
  if (actual === 'calificando') return 'calificando'
  if (actual === 'presentando') {
    if (RE_LISTO.test(mensaje)) return 'pago_pendiente'
    if (RE_OBJECION.test(mensaje)) return 'objeciones'
    return 'cerrando'
  }
  if (actual === 'objeciones') {
    if (RE_LISTO.test(mensaje)) return 'pago_pendiente'
    return 'cerrando'
  }
  if (actual === 'cerrando') {
    if (RE_LISTO.test(mensaje)) return 'pago_pendiente'
    return 'cerrando'
  }
  return actual
}

function detectarNombre(mensaje: string): string | undefined {
  const m = mensaje.match(/(?:soy|me\s+llamo|mi\s+nombre\s+es)\s+([A-ZÁÉÍÓÚa-záéíóú][a-záéíóúñ]+)/i)
  return m?.[1]
}

export async function ejecutarAgenteVentas(ctx: ContextoAgente): Promise<RespuestaAgente> {
  const inv = ctx.inventarioSeleccionado ?? ctx.inventarioTodos.find(i => i.activo)

  if (!inv) {
    return { texto: '¡Hola! 👋 Gracias por escribir. Pronto tenemos algo increíble para ti. Te aviso.' }
  }

  const p = inv.producto
  const v = p.vendedor_output
  const avatar = p.avatar_cliente
  const precioVenta = inv.precio_venta
  const precioAnchor = inv.precio_tachado ?? p.estrategia_precio?.precio_anchor ?? Math.round(precioVenta * 2.5)

  const historialStr = ctx.historial
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`)
    .join('\n')

  const nc = ctx.nombreCliente ? ctx.nombreCliente : null

  const instruccionPorEstado: Record<string, string> = {
    nuevo: `INSTRUCCIÓN: Primera vez que escribe. Adapta el guion de apertura a su mensaje. Genera curiosidad en 2-3 líneas. NO expliques el producto todavía. Termina con UNA sola pregunta corta.`,
    calificando: `INSTRUCCIÓN: Haz UNA sola pregunta de calificación rápida basada en los dolores del avatar. Si en el historial ya hay suficiente contexto, pasa directo a presentación.`,
    presentando: `INSTRUCCIÓN: Presenta el producto. Usa formato WhatsApp con negritas. Muestra precio anchor tachado (~$${precioAnchor}~) y precio real (*$${precioVenta}*). Menciona que el acceso es INMEDIATO al pagar. Termina con "¿Te lo envío ahora?" o similar.`,
    objeciones: `INSTRUCCIÓN: Responde la objeción directamente. Usa la respuesta preescrita más cercana. Recuerda que es acceso instantáneo y bajo precio. Reafirma el valor. Una frase de escasez/urgencia al final.`,
    cerrando: `INSTRUCCIÓN: El cliente está casi listo. Usa el guion de cierre. Recuerda: acceso inmediato, precio especial. Dile que solo necesita hacer la transferencia y en segundos recibe el acceso. Invítalo a pagar.`,
  }

  const instruccion = instruccionPorEstado[ctx.estado] ?? instruccionPorEstado.calificando

  const sistema = `Eres un vendedor experto en productos digitales low-ticket para WhatsApp. Vendes UN solo producto. Eres directo, cálido, sin rodeos. Escribes como un amigo que recomienda algo bueno.

━━━ PRODUCTO ━━━
Nombre: ${p.nombre_producto}
Tipo: ${p.tipo_producto ?? 'producto digital'}
Transformación: "${p.promesa_before ?? '...'}" → "${p.promesa_after ?? '...'}"
Precio tachado: ~$${precioAnchor}~ | Precio real: *$${precioVenta}*
Entrega: acceso INMEDIATO al confirmar pago (link directo)
${inv.prueba_social ? `Prueba social: ${inv.prueba_social}` : ''}
${inv.escasez_texto ? `Escasez: ${inv.escasez_texto}` : ''}

━━━ CLIENTE IDEAL ━━━
${avatar ? `${avatar.nombre_ficticio}, ${avatar.edad}, ${avatar.ocupacion}
Dolores: ${avatar.dolores.slice(0, 3).join(' | ')}
Deseos: ${avatar.deseos.slice(0, 3).join(' | ')}
Objeciones típicas: ${avatar.objeciones.slice(0, 3).join(' | ')}
Cómo habla: "${avatar.cita_directa}"` : 'No disponible'}

━━━ GUIONES PROBADOS ━━━
[APERTURA]:
${v?.guion_apertura_whatsapp ?? `Hola! ¿Buscas ${p.promesa_after ?? 'mejorar tus resultados'}? Tengo algo justo para ti.`}

[PRESENTACIÓN]:
${v?.guion_presentacion_producto ?? `${p.nombre_producto}: ${p.subtitulo ?? ''}\nAcceso inmediato · Solo $${precioVenta}`}

[CIERRE]:
${v?.guion_cierre ?? `¿Te lo envío ahora? Es solo $${precioVenta} y el acceso llega al instante.`}

[OBJECIONES]:
${v?.respuestas_objeciones?.map(o => `"${o.objecion}" → ${o.respuesta}`).join('\n') ?? 'Usa los dolores del avatar.'}

━━━ REGLAS (no negociables) ━━━
1. Máximo 3 líneas por respuesta. Los mensajes largos se ignoran en WhatsApp.
2. UNA sola pregunta por mensaje. Nunca dos.
3. Precio anchor siempre tachado primero, luego el real en negrita.
4. Nunca digas "lamentablemente", "disculpe" ni "entiendo tu preocupación".
5. Cuando el cliente quiera pagar: dile que solo necesita enviar la transferencia y el acceso llega al instante.
6. Emojis: máximo 1-2 por mensaje.
7. Responde SOLO el texto. Sin comillas. Sin explicaciones.`

  const usuario = `Estado: ${ctx.estado}${nc ? ` | Cliente: ${nc}` : ''}

Historial:
${historialStr}

Mensaje: "${ctx.mensaje}"

${instruccion}`

  const respuesta = await deepseekText(sistema, usuario, 400)
  const texto = respuesta.trim().replace(/^[""]|[""]$/g, '')

  const nextEstado = siguienteEstado(ctx.estado, ctx.mensaje)
  const nombreDetectado = detectarNombre(ctx.mensaje)

  const multimedia = (ctx.estado === 'calificando' && nextEstado === 'presentando')
    ? inv.multimedia_urls.slice(0, 1)
    : undefined

  return {
    texto,
    nuevoEstado: nextEstado,
    nuevoAgente: nextEstado === 'pago_pendiente' ? 'pagos' : 'ventas',
    inventarioIdElegido: inv.id,
    multimediaUrls: multimedia,
    nombreClienteDetectado: nombreDetectado,
  }
}
