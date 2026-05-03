// Auto-confirmación de pagos para productos digitales
// Valida el monto contra el precio del inventario y confirma automáticamente si cuadra.

import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTexto } from '@/lib/whatsapp/ycloud'

export interface DatosPago {
  monto: number | null
  metodo: string | null
  numero_operacion: string | null
  comprobante_url?: string | null
}

export interface ResultadoPago {
  estado: 'confirmado_auto' | 'pendiente'
  mensajeCliente: string
  pagoId?: string
}

/**
 * Procesa un comprobante de pago de producto digital.
 * Si el monto coincide con el precio del inventario (±10%), auto-confirma y entrega acceso.
 * Si no coincide o no hay monto legible, crea pago pendiente para revisión manual.
 */
export async function procesarPagoDigital(params: {
  userId: string
  clientePhone: string   // con +
  botPhone: string       // con +
  apiKey: string
  datos: DatosPago
}): Promise<ResultadoPago> {
  const admin = createAdminClient()
  const clientePhoneNorm = params.clientePhone.replace(/^\+/, '')

  // Cargar conversación activa del cliente
  const { data: conv } = await admin
    .from('bot_conversations')
    .select('id, inventario_id, nombre_cliente')
    .eq('user_id', params.userId)
    .eq('cliente_phone', clientePhoneNorm)
    .maybeSingle()

  // Dedup por número de operación
  if (params.datos.numero_operacion && conv?.id) {
    const { data: dup } = await admin
      .from('pagos_pendientes')
      .select('id')
      .eq('user_id', params.userId)
      .eq('numero_operacion', params.datos.numero_operacion)
      .maybeSingle()

    if (dup) {
      return {
        estado: 'pendiente',
        mensajeCliente: 'Este comprobante ya fue registrado. Si crees que hay un error, escríbenos. 🙏',
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

  // Determinar si auto-confirmar: monto conocido y dentro del ±10% del precio
  const montoRecibido = params.datos.monto
  const esAutoconfirmable =
    montoRecibido !== null &&
    montoRecibido > 0 &&
    precioEsperado !== null &&
    Math.abs(montoRecibido - precioEsperado) / precioEsperado <= 0.10

  const estadoPago = esAutoconfirmable ? 'confirmado' : 'pendiente'

  // Registrar pago
  const { data: pagoInsert } = await admin
    .from('pagos_pendientes')
    .insert({
      user_id: params.userId,
      conversacion_id: conv?.id ?? null,
      inventario_id: conv?.inventario_id ?? null,
      monto: montoRecibido,
      metodo: params.datos.metodo,
      numero_operacion: params.datos.numero_operacion,
      comprobante_url: params.datos.comprobante_url ?? null,
      estado: estadoPago,
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
        .from('inventario_bot')
        .select('conversiones')
        .eq('id', conv.inventario_id)
        .single()
      if (invData) {
        await admin
          .from('inventario_bot')
          .update({ conversiones: ((invData as any).conversiones ?? 0) + 1 })
          .eq('id', conv.inventario_id)
      }
    }

    const montoStr = montoRecibido ? `S/ ${montoRecibido.toFixed(2)}` : ''
    const metodoStr = params.datos.metodo === 'yape' ? 'Yape' :
                      params.datos.metodo === 'plin' ? 'Plin' :
                      params.datos.metodo === 'bcp'  ? 'BCP' : 'transferencia'

    const mensajeCliente = enlaceEntrega
      ? `🎉 ¡Pago confirmado${nombreCliente}! Recibí tu ${metodoStr}${montoStr ? ` de ${montoStr}` : ''}.\n\nAquí tienes tu acceso a *${nombreProducto}* 👇\n${enlaceEntrega}\n\n¡Disfrútalo! Cualquier duda estoy aquí 💪`
      : `🎉 ¡Pago confirmado${nombreCliente}! En los próximos minutos te enviamos el acceso a *${nombreProducto}*. ¡Gracias por tu confianza! 💜`

    // Enviar acceso inmediatamente
    await enviarTexto({
      to: params.clientePhone,
      text: mensajeCliente,
      fromPhone: params.botPhone,
      apiKey: params.apiKey,
    })

    return {
      estado: 'confirmado_auto',
      mensajeCliente,
      pagoId: pagoInsert?.id,
    }
  }

  // Pago pendiente de revisión manual
  const montoStr = montoRecibido ? `S/ ${montoRecibido.toFixed(2)}` : 'monto no legible'
  const mensajeCliente = `✅ ¡Recibí tu comprobante (${montoStr})! Lo estoy verificando y en breve te confirmo el acceso a *${nombreProducto}*. ¡Gracias${nombreCliente}! 🙏`

  return {
    estado: 'pendiente',
    mensajeCliente,
    pagoId: pagoInsert?.id,
  }
}
