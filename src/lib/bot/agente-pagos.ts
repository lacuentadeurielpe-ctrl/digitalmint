import { procesarPagoDigital } from './pago-auto'
import type { ContextoAgente, RespuestaAgente } from './tipos'

export async function ejecutarAgentePagos(ctx: ContextoAgente): Promise<RespuestaAgente> {
  const inv = ctx.inventarioSeleccionado ?? ctx.inventarioTodos.find(i => i.activo)
  if (!inv) {
    return { texto: 'Un momento, te comunico con un asesor 🙏', pausar: true }
  }

  const cfg = ctx.config
  const precio = inv.precio_venta
  const nombre = inv.producto.nombre_producto ?? 'el producto'
  const nc = ctx.nombreCliente ? ` ${ctx.nombreCliente}` : ''

  // ── Comprobante recibido ────────────────────────────────────────────────────
  // Imagen ya fue procesada por el webhook (Vision) y llegó como texto con metadata.
  // Aquí manejamos el caso de número de operación enviado como texto.
  const matchNumOp = ctx.mensaje.match(/\b(\d{6,14})\b/)
  const esComprobante = matchNumOp !== null && ctx.estado === 'pago_pendiente'

  if (esComprobante) {
    // Número de operación por texto → procesar pago sin monto visible
    const resultado = await procesarPagoDigital({
      userId: ctx.userId,
      clientePhone: ctx.clientePhone,
      botPhone: ctx.botPhone,
      apiKey: cfg.ycloud_api_key ?? '',
      datos: {
        monto: precio,  // asumimos el precio del producto
        metodo: null,
        numero_operacion: matchNumOp[1],
        comprobante_url: null,
      },
    })

    // Si auto-confirmó, el helper ya envió el mensaje — retornamos vacío
    if (resultado.estado === 'confirmado_auto') {
      return {
        texto: '',  // ya enviado por procesarPagoDigital
        nuevoEstado: 'cliente',
        nuevoAgente: 'crm',
      }
    }

    return {
      texto: resultado.mensajeCliente,
      nuevoEstado: 'pago_recibido',
      nuevoAgente: 'pagos',
      crearPago: {
        monto: precio,
        numero_operacion: matchNumOp[1],
      },
    }
  }

  // ── Enviar instrucciones de pago ───────────────────────────────────────────
  const metodos: string[] = []
  if (cfg.yape_numero) metodos.push(`💜 *YAPE*: ${cfg.yape_numero}`)
  if (cfg.plin_numero) metodos.push(`💙 *PLIN*: ${cfg.plin_numero}`)
  if (cfg.bcp_cuenta) {
    const titular = cfg.bcp_titular ? `\n   Titular: ${cfg.bcp_titular}` : ''
    metodos.push(`🏦 *BCP*: ${cfg.bcp_cuenta}${titular}`)
  }

  if (metodos.length === 0) {
    return {
      texto: `¡Perfecto${nc}! 🎉 Para enviarte los datos de pago, un asesor te escribe ahora mismo. ¡Ya falta poco para tener *${nombre}*!`,
      nuevoEstado: 'pago_pendiente',
      pausar: true,
    }
  }

  const texto = `¡Todo listo${nc}! Para obtener acceso inmediato a *${nombre}* transfiere *$${precio}* a:

${metodos.join('\n')}

Cuando hagas el pago, envíame el *número de operación* o una *foto del comprobante* y te mando el acceso al instante 🚀`

  return {
    texto,
    nuevoEstado: 'pago_pendiente',
    nuevoAgente: 'pagos',
    inventarioIdElegido: inv.id,
  }
}
