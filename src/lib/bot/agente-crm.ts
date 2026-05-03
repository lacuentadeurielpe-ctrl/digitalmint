import type { ContextoAgente, RespuestaAgente } from './tipos'

export async function ejecutarAgenteCRM(ctx: ContextoAgente): Promise<RespuestaAgente> {
  const inv = ctx.inventarioSeleccionado ?? ctx.inventarioTodos.find(i => i.activo)
  const nombre = ctx.nombreCliente ? ` ${ctx.nombreCliente}` : ''
  const producto = inv?.producto.nombre_producto ?? 'tu producto'
  const enlace = inv?.enlace_entrega

  // Pago recibido, esperando confirmación del dueño
  if (ctx.estado === 'pago_recibido') {
    return {
      texto: `¡Hola${nombre}! 😊 Tu comprobante ya está siendo revisado. En breve recibirás el acceso. ¿Alguna duda mientras tanto?`,
      nuevoEstado: 'pago_recibido',
    }
  }

  // Pago confirmado por el dueño → entregar acceso
  if (ctx.estado === 'cliente') {
    if (enlace) {
      return {
        texto: `🎉 ¡Bienvenido${nombre}! Tu pago fue confirmado.\n\nAquí tienes tu acceso a *${producto}*:\n${enlace}\n\n¡Mucho éxito! Ante cualquier duda, estoy aquí. 💪`,
        nuevoEstado: 'cliente',
      }
    }
    return {
      texto: `🎉 ¡Bienvenido${nombre}! Tu pago fue confirmado. El equipo te enviará el acceso a *${producto}* en breve. ¡Gracias por tu confianza! 💜`,
      nuevoEstado: 'cliente',
    }
  }

  // Cliente existente haciendo consultas
  return {
    texto: `¡Hola${nombre}! 👋 Qué bueno saber de ti. ¿En qué puedo ayudarte?${enlace ? `\n\nRecuerda que tu acceso está aquí: ${enlace}` : ''}`,
    nuevoEstado: 'cliente',
  }
}
