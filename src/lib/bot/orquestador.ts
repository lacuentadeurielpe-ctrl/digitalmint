import { createAdminClient } from '@/lib/supabase/admin'
import { clasificar } from './clasificador'
import { ejecutarAgenteVentas } from './agente-ventas'
import { ejecutarAgentePagos } from './agente-pagos'
import { ejecutarAgenteCRM } from './agente-crm'
import { aplicarCompaction } from './compaction'
import { inferirYActualizarPerfil, cargarPerfil } from './memoria'
import type {
  EstadoConversacion, AgenteActual, MensajeBot,
  InventarioItem, ConfigBot, ContextoAgente, ProductoBot,
} from './tipos'

export async function procesarMensaje(params: {
  clientePhone: string
  botPhone: string
  userId: string
  mensaje: string
  tipoMensaje: 'text' | 'image' | 'audio' | 'otro'
  imagenUrl?: string
}): Promise<{ respuesta: string; multimediaUrls?: string[] } | null> {
  const admin = createAdminClient()
  const clientePhoneNorm = params.clientePhone.replace('+', '')

  // ── Carga en paralelo ───────────────────────────────────────────────────────
  const [convRes, settingsRes, invRes] = await Promise.all([
    admin
      .from('bot_conversations')
      .select('id, mensajes, estado, agente_actual, inventario_id, pausado, nombre_cliente, resumen_contexto, perfil_cliente')
      .eq('user_id', params.userId)
      .eq('cliente_phone', clientePhoneNorm)
      .maybeSingle(),

    admin
      .from('user_settings')
      .select('yape_numero, plin_numero, bcp_cuenta, bcp_titular, bbva_cuenta, bbva_titular, interbank_cuenta, mercadopago_link, paypal_link, bot_nombre, bot_phone, ycloud_api_key, moneda, simbolo_moneda')
      .eq('user_id', params.userId)
      .maybeSingle(),

    admin
      .from('inventario_bot')
      .select(`id, product_id, precio_venta, precio_tachado, enlace_entrega,
               multimedia_urls, prueba_social, escasez_texto, activo, leads, conversiones,
               products(id, nombre_producto, subtitulo, promesa_before, promesa_after,
                        precio_sugerido, estrategia_precio, tipo_producto,
                        avatar_cliente, vendedor_output, ganchos_redes)`)
      .eq('user_id', params.userId)
      .eq('activo', true),
  ])

  const conv = convRes.data
  if (conv?.pausado) return null

  // ── Mapear inventario ───────────────────────────────────────────────────────
  const inventario: InventarioItem[] = ((invRes.data ?? []) as any[]).map(row => ({
    id: row.id,
    product_id: row.product_id,
    precio_venta: row.precio_venta,
    precio_tachado: row.precio_tachado,
    enlace_entrega: row.enlace_entrega,
    multimedia_urls: row.multimedia_urls ?? [],
    prueba_social: row.prueba_social,
    escasez_texto: row.escasez_texto,
    activo: row.activo,
    leads: row.leads,
    conversiones: row.conversiones,
    producto: row.products as ProductoBot,
  }))

  const s = settingsRes.data as any
  const config: ConfigBot = {
    yape_numero: s?.yape_numero ?? null,
    plin_numero: s?.plin_numero ?? null,
    bcp_cuenta: s?.bcp_cuenta ?? null,
    bcp_titular: s?.bcp_titular ?? null,
    bbva_cuenta: s?.bbva_cuenta ?? null,
    bbva_titular: s?.bbva_titular ?? null,
    interbank_cuenta: s?.interbank_cuenta ?? null,
    mercadopago_link: s?.mercadopago_link ?? null,
    paypal_link: s?.paypal_link ?? null,
    bot_nombre: s?.bot_nombre ?? 'Asistente',
    bot_phone: s?.bot_phone ?? null,
    ycloud_api_key: s?.ycloud_api_key ?? null,
    moneda: s?.moneda ?? 'PEN',
    simbolo_moneda: s?.simbolo_moneda ?? 'S/',
  }

  const estado = ((conv?.estado as EstadoConversacion) ?? 'nuevo')
  const historialCompleto = ((conv?.mensajes ?? []) as MensajeBot[])
  const resumenPrevio = (conv as any)?.resumen_contexto ?? null
  const perfilGuardado = (conv as any)?.perfil_cliente ?? {}

  // ── Compaction: si historial > 15 mensajes, resumir los viejos ─────────────
  const { mensajesRecientes: historial, resumen: resumenContexto } = conv?.id
    ? await aplicarCompaction({
        conversacionId: conv.id,
        historial: historialCompleto,
        resumenPrevio,
      })
    : { mensajesRecientes: historialCompleto, resumen: null }

  const invSeleccionado = conv?.inventario_id
    ? (inventario.find(i => i.id === conv.inventario_id) ?? null)
    : (inventario.length === 1 ? inventario[0] : null)

  const ctx: ContextoAgente = {
    conversacionId: conv?.id ?? '',
    clientePhone: params.clientePhone,
    botPhone: params.botPhone,
    userId: params.userId,
    estado,
    agente: ((conv?.agente_actual as AgenteActual) ?? 'ventas'),
    inventarioSeleccionado: invSeleccionado,
    inventarioTodos: inventario,
    pausado: conv?.pausado ?? false,
    nombreCliente: conv?.nombre_cliente ?? null,
    historial,
    resumenContexto,
    perfilCliente: perfilGuardado,
    mensaje: params.mensaje,
    tipoMensaje: params.tipoMensaje,
    imagenUrl: params.imagenUrl,
    config,
  }

  // ── Clasificar → agente ────────────────────────────────────────────────────
  const clas = clasificar(params.mensaje, params.tipoMensaje, estado)
  ctx.agente = clas.agente

  // ── Ejecutar agente ────────────────────────────────────────────────────────
  let resultado
  if (clas.agente === 'pagos') {
    resultado = await ejecutarAgentePagos(ctx)
  } else if (clas.agente === 'crm') {
    resultado = await ejecutarAgenteCRM(ctx)
  } else {
    resultado = await ejecutarAgenteVentas(ctx)
  }

  // Si el agente no generó texto (e.g. auto-confirmación ya envió el mensaje), salir
  if (!resultado.texto) return null

  // ── Inferir y actualizar perfil del cliente (fire & forget) ────────────────
  if (conv?.id) {
    inferirYActualizarPerfil({
      conversacionId: conv.id,
      mensaje: params.mensaje,
      productoNombre: invSeleccionado?.producto.nombre_producto ?? undefined,
      estadoNuevo: resultado.nuevoEstado,
    }).catch(() => {})
  }

  // ── Actualizar historial y estado ──────────────────────────────────────────
  const nuevosMensajes: MensajeBot[] = [
    ...historialCompleto.slice(-20),
    { role: 'user', content: params.mensaje, timestamp: new Date().toISOString() },
    { role: 'assistant', content: resultado.texto, timestamp: new Date().toISOString() },
  ]

  const updateData: Record<string, unknown> = {
    mensajes: nuevosMensajes,
    agente_actual: resultado.nuevoAgente ?? clas.agente,
    updated_at: new Date().toISOString(),
    ultimo_mensaje_at: new Date().toISOString(),
  }
  if (resultado.nuevoEstado)       updateData.estado = resultado.nuevoEstado
  if (resultado.inventarioIdElegido) updateData.inventario_id = resultado.inventarioIdElegido
  if (resultado.nombreClienteDetectado && !conv?.nombre_cliente) {
    updateData.nombre_cliente = resultado.nombreClienteDetectado
  }
  if (resultado.pausar) updateData.pausado = true

  let convId = conv?.id ?? null

  if (convId) {
    await admin.from('bot_conversations').update(updateData).eq('id', convId)
  } else {
    const { data: nueva } = await admin
      .from('bot_conversations')
      .insert({
        user_id: params.userId,
        cliente_phone: clientePhoneNorm,
        mensajes: nuevosMensajes,
        estado: resultado.nuevoEstado ?? 'calificando',
        agente_actual: resultado.nuevoAgente ?? 'ventas',
        inventario_id: resultado.inventarioIdElegido ?? null,
        nombre_cliente: resultado.nombreClienteDetectado ?? null,
      })
      .select('id')
      .single()
    convId = nueva?.id ?? null

    // Incrementar leads para nueva conversación
    if (resultado.inventarioIdElegido) {
      const inv = inventario.find(i => i.id === resultado.inventarioIdElegido)
      if (inv) {
        await admin
          .from('inventario_bot')
          .update({ leads: inv.leads + 1 })
          .eq('id', inv.id)
      }
    }
  }

  // ── Registrar pago si llegó comprobante ───────────────────────────────────
  if (resultado.crearPago && convId) {
    await admin.from('pagos_pendientes').insert({
      conversacion_id: convId,
      user_id: params.userId,
      inventario_id: resultado.inventarioIdElegido ?? conv?.inventario_id ?? null,
      monto: resultado.crearPago.monto,
      comprobante_url: resultado.crearPago.comprobante_url ?? null,
      numero_operacion: resultado.crearPago.numero_operacion ?? null,
      estado: 'pendiente',
    })
  }

  return {
    respuesta: resultado.texto,
    multimediaUrls: resultado.multimediaUrls,
  }
}
