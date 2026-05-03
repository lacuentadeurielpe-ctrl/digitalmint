import type { EstadoConversacion, AgenteActual } from './tipos'

export interface Clasificacion {
  agente: AgenteActual
  intencion: string
}

const RE_COMPROBANTE_TEXTO = /\b(\d{6,12})\b/
const RE_QUIERE_PAGAR = /\b(quiero\s+comprar|c[oó]mo\s+pago|c[oó]mo\s+pagar|lo\s+quiero|me\s+interesa\s+comprar|acepto|dale|ok\s+lo\s+compro|pagar|quiero\s+el\s+acceso|quiero\s+empezar|listo\s+para\s+pagar)\b/i
const RE_OBJECION = /\b(caro|costoso|piénselo|pensarlo|no\s+s[eé]|duda|garant[íi]a|no\s+tengo\s+tiempo|no\s+tengo\s+dinero|despu[eé]s|m[aá]s\s+tarde|lo\s+veo)\b/i
const RE_SALUDO = /^(hola|buenas|buenos|hey|hi|buen\s+d[íi]a|info|informaci[oó]n|quiero\s+info)[\s!.]*$/i

export function clasificar(
  mensaje: string,
  tipoMensaje: string,
  estadoActual: EstadoConversacion,
): Clasificacion {
  // Si está pausado, el soporte toma control
  if (estadoActual === 'pausado') {
    return { agente: 'soporte', intencion: 'pausado' }
  }

  // Imagen en estado pago_pendiente → comprobante
  if (tipoMensaje === 'image' && estadoActual === 'pago_pendiente') {
    return { agente: 'pagos', intencion: 'comprobante_imagen' }
  }

  // Texto con número de operación en estado pago_pendiente → comprobante
  if (estadoActual === 'pago_pendiente' && RE_COMPROBANTE_TEXTO.test(mensaje)) {
    return { agente: 'pagos', intencion: 'comprobante_numero' }
  }

  // Cliente confirmado → CRM
  if (estadoActual === 'cliente') {
    return { agente: 'crm', intencion: 'post_compra' }
  }

  // Pago recibido → CRM
  if (estadoActual === 'pago_recibido') {
    return { agente: 'crm', intencion: 'esperando_confirmacion' }
  }

  // Listo para pagar → pagos
  if (RE_QUIERE_PAGAR.test(mensaje)) {
    return { agente: 'pagos', intencion: 'quiere_comprar' }
  }

  // Objeción detectada → ventas (manejo de objeciones)
  if (RE_OBJECION.test(mensaje) && ['presentando', 'cerrando'].includes(estadoActual)) {
    return { agente: 'ventas', intencion: 'objecion' }
  }

  // Saludo inicial
  if (RE_SALUDO.test(mensaje.trim())) {
    return { agente: 'ventas', intencion: 'saludo' }
  }

  // Default: ventas continúa el flujo
  return { agente: 'ventas', intencion: 'conversacion' }
}
