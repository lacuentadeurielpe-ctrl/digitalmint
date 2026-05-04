// Auto-confirmación de pagos para productos digitales
// Valida monto + destino y confirma automáticamente si todo cuadra.

import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTexto } from '@/lib/whatsapp/ycloud'

export interface DatosPago {
  monto: number | null
  moneda: string | null
  metodo: string | null
  numero_operacion: string | null
  destinatario_ultimos: string | null   // últimos dígitos del número/cuenta destino
  destinatario_nombre: string | null
  comprobante_url?: string | null
}

export interface ResultadoPago {
  estado: 'confirmado_auto' | 'pendiente'
  mensajeCliente: string
  pagoId?: string
}

interface ConfigPagos {
  yape_numero?: string | null
  plin_numero?: string | null
  bcp_cuenta?: string | null
  bcp_titular?: string | null
  bbva_cuenta?: string | null
  bbva_titular?: string | null
  interbank_cuenta?: string | null
  mercadopago_link?: string | null
  paypal_link?: string | null
  simbolo_moneda?: string | null
  moneda?: string | null
}

/** Valida que los últimos N dígitos del comprobante coincidan con el número configurado */
function validarUltimosDigitos(
  configNumero: string | null | undefined,
  comprobanteUltimos: string | null | undefined,
  n: number,
): boolean {
  if (!configNumero || !comprobanteUltimos) return true // sin datos → no rechazar
  const configFin = configNumero.replace(/\D/g, '').slice(-n)
  const compFin   = comprobanteUltimos.replace(/\D/g, '').slice(-n)
  return configFin === compFin
}

/** Valida el método y destino del comprobante contra la configuración del dueño */
function validarDestino(datos: DatosPago, cfg: ConfigPagos): { ok: boolean; razon?: string } {
  const m = datos.metodo

  if (m === 'yape') {
    if (!cfg.yape_numero) return { ok: true } // método no configurado → aceptar
    // Yape no expone últimos dígitos del destino en el comprobante → solo verificar que el método esté activo
    return { ok: true }
  }

  if (m === 'plin') {
    if (!cfg.plin_numero) return { ok: true }
    if (!validarUltimosDigitos(cfg.plin_numero, datos.destinatario_ultimos, 3)) {
      return { ok: false, razon: `Número Plin destino (...${datos.destinatario_ultimos}) no coincide con el configurado (...${cfg.plin_numero.slice(-3)})` }
    }
    return { ok: true }
  }

  if (m === 'bcp') {
    if (!cfg.bcp_cuenta) return { ok: true }
    if (!validarUltimosDigitos(cfg.bcp_cuenta, datos.destinatario_ultimos, 4)) {
      return { ok: false, razon: `Cuenta BCP destino (...${datos.destinatario_ultimos}) no coincide con la configurada (...${cfg.bcp_cuenta.replace(/\D/g, '').slice(-4)})` }
    }
    return { ok: true }
  }

  if (m === 'bbva') {
    if (!cfg.bbva_cuenta) return { ok: true }
    if (!validarUltimosDigitos(cfg.bbva_cuenta, datos.destinatario_ultimos, 4)) {
      return { ok: false, razon: `Cuenta BBVA destino (...${datos.destinatario_ultimos}) no coincide` }
    }
    return { ok: true }
  }

  if (m === 'interbank') {
    if (!cfg.interbank_cuenta) return { ok: true }
    if (!validarUltimosDigitos(cfg.interbank_cuenta, datos.destinatario_ultimos, 4)) {
      return { ok: false, razon: `Cuenta Interbank destino (...${datos.destinatario_ultimos}) no coincide` }
    }
    return { ok: true }
  }

  // mercadopago, paypal, scotiabank, transferencia, otro → aceptar sin validar dígitos
  return { ok: true }
}

export async function procesarPagoDigital(params: {
  userId: string
  clientePhone: string   // con +
  botPhone: string       // con +
  apiKey: string
  datos: DatosPago
  configPagos?: ConfigPagos
}): Promise<ResultadoPago> {
  const admin = createAdminClient()
  const clientePhoneNorm = params.clientePhone.replace(/^\+/, '')
  const simbolo = params.configPagos?.simbolo_moneda ?? 'S/'

  // Cargar conversación activa del cliente
  const { data: conv } = await admin
    .from('bot_conversations')
    .select('id, inventario_id, nombre_cliente')
    .eq('user_id', params.userId)
    .eq('cliente_phone', clientePhoneNorm)
    .maybeSingle()

  // Dedup por número de operación
  if (params.datos.numero_operacion) {
    const { data: dup } = await admin
      .from('pagos_pendientes')
      .select('id')
      .eq('user_id', params.userId)
      .eq('numero_operacion', params.datos.numero_operacion)
      .maybeSingle()
    if (dup) {
      return {
        estado: 'pendiente',
        mensajeCliente: 'Este comprobante ya fue registrado anteriormente. Si hay algún error, escríbenos. 🙏',
      }
    }
  }

  // Cargar precio esperado del inventario
  let precioEsperado: number | null = null
  let enlaceEntrega: string | null = null
  let nombreProducto = 'el producto'

  if (conv?.inventario_id) {
    const { data: inv } = await admin
      .from('inventario_bot')
      .select('precio_venta, enlace_entrega, products(nombre_producto)')
      .eq('id', conv.inventario_id)
      .single()
    if (inv) {
      precioEsperado = Number(inv.precio_venta)
      enlaceEntrega = inv.enlace_entrega ?? null
      nombreProducto = (inv.products as any)?.nombre_producto ?? 'el producto'
    }
  }

  const nombreCliente = conv?.nombre_cliente ? ` ${conv.nombre_cliente}` : ''
  const montoRecibido = params.datos.monto
  const metodoStr = {
    yape: 'Yape', plin: 'Plin', bcp: 'BCP', bbva: 'BBVA',
    interbank: 'Interbank', scotiabank: 'Scotiabank',
    mercadopago: 'MercadoPago', paypal: 'PayPal',
  }[params.datos.metodo ?? ''] ?? params.datos.metodo ?? 'transferencia'

  // Validar destino
  const validacion = params.configPagos
    ? validarDestino(params.datos, params.configPagos)
    : { ok: true }

  // Determinar si auto-confirmar:
  // 1. Validación de destino ok
  // 2. Monto conocido y dentro del ±15% del precio esperado
  const montoOk = montoRecibido !== null && montoRecibido > 0 &&
    precioEsperado !== null &&
    Math.abs(montoRecibido - precioEsperado) / precioEsperado <= 0.15

  const esAutoconfirmable = validacion.ok && montoOk

  const estadoPago = esAutoconfirmable ? 'confirmado' : 'pendiente'
  const montoStr = montoRecibido ? `${simbolo}${montoRecibido.toFixed(2)}` : 'monto no legible'

  // Registrar pago
  const { data: pagoInsert } = await admin
    .from('pagos_pendientes')
    .insert({
      user_id: params.userId,
      conversacion_id: conv?.id ?? null,
      inventario_id: conv?.inventario_id ?? null,
      monto: montoRecibido,
      metodo: params.datos.metodo,
      numero_operacion: params.datos.numero_operacion ?? null,
      comprobante_url: params.datos.comprobante_url ?? null,
      estado: estadoPago,
      notas: !validacion.ok ? validacion.razon : (!montoOk && precioEsperado ? `Monto ${montoStr} no coincide con precio esperado ${simbolo}${precioEsperado.toFixed(2)}` : null),
    })
    .select('id')
    .single()

  if (esAutoconfirmable && conv?.id) {
    // Marcar conversación como cliente y enviar acceso
    await admin
      .from('bot_conversations')
      .update({ estado: 'cliente', pausado: false, updated_at: new Date().toISOString() })
      .eq('id', conv.id)

    // Incrementar conversiones
    if (conv.inventario_id) {
      const { data: invData } = await admin
        .from('inventario_bot').select('conversiones').eq('id', conv.inventario_id).single()
      if (invData) {
        await admin.from('inventario_bot')
          .update({ conversiones: ((invData as any).conversiones ?? 0) + 1 })
          .eq('id', conv.inventario_id)
      }
    }

    const mensajeCliente = enlaceEntrega
      ? `🎉 ¡Pago confirmado${nombreCliente}! Recibí tu ${metodoStr} de *${montoStr}*.\n\nAquí tienes tu acceso a *${nombreProducto}* 👇\n${enlaceEntrega}\n\n¡Disfrútalo! Cualquier duda estoy aquí 💪`
      : `🎉 ¡Pago confirmado${nombreCliente}! En breve te enviamos el acceso a *${nombreProducto}*. ¡Gracias! 💜`

    await enviarTexto({ to: params.clientePhone, text: mensajeCliente, fromPhone: params.botPhone, apiKey: params.apiKey })

    return { estado: 'confirmado_auto', mensajeCliente, pagoId: pagoInsert?.id }
  }

  // Pago pendiente de revisión manual
  const razon = !validacion.ok
    ? `el número destino no coincide con el configurado`
    : `el monto de ${montoStr} no coincide exactamente con el precio del producto`

  const mensajeCliente = `✅ ¡Recibí tu comprobante de ${metodoStr} (${montoStr})${nombreCliente}! Lo estoy verificando — ${
    !validacion.ok
      ? 'hay una pequeña discrepancia en el destino, un momento.'
      : precioEsperado && !montoOk
        ? `el precio del producto es ${simbolo}${precioEsperado?.toFixed(2)}, verificando.`
        : 'en breve te confirmo el acceso.'
  } 🙏`

  return { estado: 'pendiente', mensajeCliente, pagoId: pagoInsert?.id }
}
