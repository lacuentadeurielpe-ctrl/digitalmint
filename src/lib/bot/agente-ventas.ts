import { deepseekText } from '@/lib/ai/deepseek'
import type { ContextoAgente, RespuestaAgente, EstadoConversacion } from './tipos'

// Palabras que indican interés genuino para avanzar de calificando → presentando
const RE_INTERES = /\b(s[íi]|claro|me\s+interesa|cu[eé]ntame|c[oó]mo\s+funciona|exacto|eso\s+es|quiero\s+saber|me\s+parece|cuánto|precio|cu[aá]nto)\b/i
// Palabras que indican listo para cierre
const RE_LISTO = /\b(me\s+convenc[eé]|me\s+interesa\s+mucho|quiero|lo\s+compro|dale|ok|perfecto|suena\s+bien|vamos)\b/i

function siguienteEstado(actual: EstadoConversacion, mensaje: string): EstadoConversacion {
  if (actual === 'nuevo') return 'calificando'
  if (actual === 'calificando' && RE_INTERES.test(mensaje)) return 'presentando'
  if (actual === 'calificando') return 'calificando'
  if (actual === 'presentando') {
    if (/\b(caro|costoso|pensarlo|no\s+s[eé]|duda|tiempo|despu[eé]s)\b/i.test(mensaje)) return 'objeciones'
    return 'cerrando'
  }
  if (actual === 'objeciones') return 'cerrando'
  if (actual === 'cerrando' && RE_LISTO.test(mensaje)) return 'pago_pendiente'
  return actual
}

function detectarNombre(mensaje: string): string | undefined {
  const m = mensaje.match(/(?:soy|me\s+llamo|mi\s+nombre\s+es)\s+([A-ZÁÉÍÓÚa-záéíóú][a-záéíóúñ]+)/i)
  return m?.[1]
}

export async function ejecutarAgenteVentas(ctx: ContextoAgente): Promise<RespuestaAgente> {
  const inv = ctx.inventarioSeleccionado ?? ctx.inventarioTodos.find(i => i.activo)

  if (!inv) {
    return {
      texto: 'Hola! 👋 Gracias por escribir. En este momento estamos preparando algo increíble para ti. Te avisamos pronto.',
    }
  }

  const p = inv.producto
  const v = p.vendedor_output
  const avatar = p.avatar_cliente
  const precioVenta = inv.precio_venta
  const precioAnchor = inv.precio_tachado ?? p.estrategia_precio?.precio_anchor ?? Math.round(precioVenta * 3)

  const historialStr = ctx.historial
    .slice(-8)
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`)
    .join('\n')

  const nombreCliente = ctx.nombreCliente ? `\nNombre del cliente: ${ctx.nombreCliente}` : ''

  const instruccionPorEstado: Record<string, string> = {
    nuevo: `INSTRUCCIÓN: Primera vez que escribe. Personaliza el script de APERTURA según su mensaje. No copies literal — adapta el tono y contexto. Sé cálido, directo y genera curiosidad.`,
    calificando: `INSTRUCCIÓN: Haz UNA sola pregunta de calificación basada en los dolores del avatar. El objetivo es confirmar que encaja con el producto. Si ya tienes suficiente info de sus mensajes, pasa directamente a la PRESENTACIÓN.`,
    presentando: `INSTRUCCIÓN: Envía la PRESENTACIÓN completa. Incluye: precio anchor tachado (~$${precioAnchor}~) → precio real (*$${precioVenta}*). Termina con una pregunta de cierre suave tipo "¿Esto es lo que buscas?"`,
    objeciones: `INSTRUCCIÓN: El cliente puso resistencia. Identifica qué objeción es y usa la respuesta pre-escrita que mejor aplique. Añade urgencia o escasez concreta al final. No te disculpes.`,
    cerrando: `INSTRUCCIÓN: El cliente está convencido. Usa el script de CIERRE. Incluye escasez/urgencia. Termina invitándolo a que te diga cuando quiera comprar para darle los datos de pago.`,
  }

  const instruccion = instruccionPorEstado[ctx.estado] ?? instruccionPorEstado.calificando

  const sistema = `Eres un agente de ventas experto en psicología de conversión para WhatsApp. Tu única misión es vender el siguiente producto digital. Eres preciso, confiado y empático.

━━━ PRODUCTO ━━━
Nombre: ${p.nombre_producto}
Subtítulo: ${p.subtitulo ?? ''}
Tipo: ${p.tipo_producto ?? 'producto digital'}
Transformación: De "${p.promesa_before ?? ''}" → A "${p.promesa_after ?? ''}"
Precio tachado: ~$${precioAnchor}~ | Precio real: *$${precioVenta}*
${inv.prueba_social ? `Prueba social: ${inv.prueba_social}` : ''}
${inv.escasez_texto ? `Escasez: ${inv.escasez_texto}` : ''}

━━━ COMPRADOR IDEAL ━━━
${avatar ? `${avatar.nombre_ficticio}, ${avatar.edad}, ${avatar.ocupacion}
Sus dolores: ${avatar.dolores.join(' | ')}
Sus deseos: ${avatar.deseos.join(' | ')}
Objeciones típicas: ${avatar.objeciones.join(' | ')}
Cómo habla de su problema: "${avatar.cita_directa}"` : 'No disponible'}

━━━ SCRIPTS PROBADOS ━━━
[APERTURA]:
${v?.guion_apertura_whatsapp ?? `Hola! Vi que te interesa ${p.nombre_producto}. ¿Qué resultado específico estás buscando?`}

[PRESENTACIÓN]:
${v?.guion_presentacion_producto ?? `${p.nombre_producto}: ${p.subtitulo ?? ''}`}

[CIERRE]:
${v?.guion_cierre ?? `¿Estás listo/a para dar el siguiente paso y transformar tu situación?`}

[OBJECIONES RESPONDIDAS]:
${v?.respuestas_objeciones?.map(o => `"${o.objecion}" → ${o.respuesta}`).join('\n') ?? 'Usa los dolores del avatar para responder objeciones.'}

━━━ REGLAS DE ORO ━━━
1. Máximo 4 oraciones por respuesta. WhatsApp ≠ email.
2. Precio anchor SIEMPRE primero tachado, luego el real en negrita.
3. UNA sola pregunta por mensaje. Nunca dos.
4. Usa el nombre del cliente si lo sabes.
5. Nunca pidas disculpas. Nunca digas "lamentablemente". Eres el experto.
6. Emojis: máximo 2 por mensaje, solo si aportan.
7. Responde SOLO el texto del mensaje. Sin comillas. Sin explicaciones.`

  const usuario = `Estado actual: ${ctx.estado}${nombreCliente}

Historial:
${historialStr}

Mensaje del cliente: "${ctx.mensaje}"

${instruccion}`

  const respuesta = await deepseekText(sistema, usuario, 500)
  const texto = respuesta.trim().replace(/^[""]|[""]$/g, '')

  const nextEstado = siguienteEstado(ctx.estado, ctx.mensaje)
  const nombreDetectado = detectarNombre(ctx.mensaje)

  // Enviar multimedia (imagen del producto) al pasar a "presentando"
  const multimedia = (ctx.estado === 'calificando' && nextEstado === 'presentando')
    ? inv.multimedia_urls.slice(0, 1)
    : undefined

  return {
    texto,
    nuevoEstado: nextEstado,
    nuevoAgente: 'ventas',
    inventarioIdElegido: inv.id,
    multimediaUrls: multimedia,
    nombreClienteDetectado: nombreDetectado,
  }
}
