export type EstadoConversacion =
  | 'nuevo'           // primer mensaje
  | 'calificando'     // verificando que encaja con el producto
  | 'presentando'     // mostrando el producto
  | 'objeciones'      // manejando resistencias
  | 'cerrando'        // close: listo para pagar
  | 'pago_pendiente'  // esperando transferencia
  | 'pago_recibido'   // comprobante llegó, pendiente confirmar
  | 'cliente'         // pago confirmado, acceso entregado
  | 'pausado'         // humano tomó el control

export type AgenteActual = 'ventas' | 'pagos' | 'crm' | 'soporte'

export interface MensajeBot {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface ProductoBot {
  id: string
  nombre_producto: string | null
  subtitulo: string | null
  promesa_before: string | null
  promesa_after: string | null
  precio_sugerido: number | null
  tipo_producto: string | null
  estrategia_precio: { precio_anchor?: number; precio_principal?: number } | null
  avatar_cliente: {
    nombre_ficticio: string
    edad: string
    ocupacion: string
    dolores: string[]
    deseos: string[]
    objeciones: string[]
    cita_directa: string
  } | null
  vendedor_output: {
    guion_apertura_whatsapp?: string
    guion_presentacion_producto?: string
    guion_cierre?: string
    mensaje_entrega?: string
    respuestas_objeciones?: Array<{ objecion: string; respuesta: string }>
  } | null
  ganchos_redes: string[] | null
}

export interface InventarioItem {
  id: string
  product_id: string
  precio_venta: number
  precio_tachado: number | null
  enlace_entrega: string | null
  multimedia_urls: string[]
  prueba_social: string | null
  escasez_texto: string | null
  activo: boolean
  leads: number
  conversiones: number
  producto: ProductoBot
}

export interface ConfigBot {
  yape_numero: string | null
  plin_numero: string | null
  bcp_cuenta: string | null
  bcp_titular: string | null
  bot_nombre: string
  bot_phone: string | null
  ycloud_api_key: string | null
}

export interface ContextoAgente {
  conversacionId: string
  clientePhone: string
  botPhone: string
  userId: string
  estado: EstadoConversacion
  agente: AgenteActual
  inventarioSeleccionado: InventarioItem | null
  inventarioTodos: InventarioItem[]
  pausado: boolean
  nombreCliente: string | null
  historial: MensajeBot[]
  resumenContexto: string | null       // compaction de mensajes viejos
  perfilCliente: Record<string, unknown> // perfil aprendido del cliente
  mensaje: string
  tipoMensaje: 'text' | 'image' | 'audio' | 'otro'
  imagenUrl?: string
  config: ConfigBot
}

export interface RespuestaAgente {
  texto: string
  nuevoEstado?: EstadoConversacion
  nuevoAgente?: AgenteActual
  inventarioIdElegido?: string
  multimediaUrls?: string[]
  nombreClienteDetectado?: string
  crearPago?: {
    monto: number
    comprobante_url?: string
    numero_operacion?: string
    metodo?: string
  }
  pausar?: boolean
}
