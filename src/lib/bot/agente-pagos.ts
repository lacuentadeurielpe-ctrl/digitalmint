import type { ContextoAgente, RespuestaAgente } from './tipos'

export async function ejecutarAgentePagos(ctx: ContextoAgente): Promise<RespuestaAgente> {
  const inv = ctx.inventarioSeleccionado ?? ctx.inventarioTodos.find(i => i.activo)
  if (!inv) {
    return { texto: 'Un momento, te comunico con un asesor. 🙏', pausar: true }
  }

  const cfg = ctx.config
  const precio = inv.precio_venta
  const nombre = inv.producto.nombre_producto ?? 'el producto'

  // Construir métodos de pago disponibles
  const metodos: string[] = []
  if (cfg.yape_numero) metodos.push(`💜 *YAPE*: ${cfg.yape_numero}`)
  if (cfg.plin_numero) metodos.push(`💙 *PLIN*: ${cfg.plin_numero}`)
  if (cfg.bcp_cuenta) {
    const titular = cfg.bcp_titular ? `\n   Titular: ${cfg.bcp_titular}` : ''
    metodos.push(`🏦 *BCP*: Cuenta ${cfg.bcp_cuenta}${titular}`)
  }

  if (metodos.length === 0) {
    // Sin métodos configurados → pausar y notificar
    return {
      texto: `¡Perfecto! 🎉 Para enviarte los datos de pago, un asesor te contactará en breve. ¡Ya falta poco para tener acceso a *${nombre}*!`,
      nuevoEstado: 'pago_pendiente',
      pausar: true,
    }
  }

  // Imagen o número de operación → es un comprobante
  const esImagenComprobante = ctx.tipoMensaje === 'image'
  const matchNumOp = ctx.mensaje.match(/\b(\d{6,12})\b/)
  const esComprobante = esImagenComprobante || (matchNumOp !== null && ctx.estado === 'pago_pendiente')

  if (esComprobante) {
    return {
      texto: `✅ ¡Comprobante recibido! Lo estamos verificando.\n\nEn unos minutos te enviamos el acceso a *${nombre}*. ¡Gracias por tu confianza! 🙏`,
      nuevoEstado: 'pago_recibido',
      nuevoAgente: 'pagos',
      crearPago: {
        monto: precio,
        comprobante_url: esImagenComprobante ? ctx.imagenUrl : undefined,
        numero_operacion: matchNumOp?.[1],
      },
    }
  }

  // Instrucciones de pago
  const texto = `¡Genial! Para completar tu compra de *${nombre}*, transfiere *$${precio}* por cualquiera de estos métodos:

${metodos.join('\n')}

Cuando transfieras, envíame el *número de operación* o una *foto del comprobante* y te mando el acceso al instante. 🚀`

  return {
    texto,
    nuevoEstado: 'pago_pendiente',
    nuevoAgente: 'pagos',
    inventarioIdElegido: inv.id,
  }
}
