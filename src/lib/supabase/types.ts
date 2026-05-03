export type ProductStatus = 'pending' | 'generating' | 'complete' | 'failed'
export type Platform = 'gumroad' | 'hotmart' | 'stripe'
export type Plan = 'free' | 'pro' | 'agency'

export interface AvatarCliente {
  nombre_ficticio: string
  edad: string
  ocupacion: string
  dolores: string[]
  deseos: string[]
  objeciones: string[]
  donde_vive: string
  nivel_ingresos: string
  cita_directa: string
}

export interface EstructuraProducto {
  tipo: string
  modulos: Array<{
    numero: number
    titulo: string
    descripcion: string
    transformacion: string
    lecciones?: string[]
    es_pareto?: boolean
  }>
}

export interface EstrategiaPrecio {
  precio_anchor: number
  precio_principal: number
  precio_downsell?: number
  justificacion: string
  tiers?: Array<{ nombre: string; precio: number; incluye: string[] }>
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          user_id: string
          titulo: string | null
          idea_original: string
          status: ProductStatus
          current_agent: number
          investigador_output: Record<string, unknown> | null
          estratega_output: Record<string, unknown> | null
          creador_output: Record<string, unknown> | null
          vendedor_output: Record<string, unknown> | null
          nombre_producto: string | null
          subtitulo: string | null
          promesa_before: string | null
          promesa_after: string | null
          avatar_cliente: AvatarCliente | null
          estructura_producto: EstructuraProducto | null
          precio_sugerido: number | null
          estrategia_precio: EstrategiaPrecio | null
          pagina_ventas: string | null
          ganchos_redes: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      product_analytics: {
        Row: {
          id: string
          product_id: string
          user_id: string
          views: number
          exports: number
          earnings_potential: number | null
          platform: Platform | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_analytics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['product_analytics']['Insert']>
      }
      user_settings: {
        Row: {
          user_id: string
          ycloud_api_key: string | null
          bot_activo: boolean
          bot_phone: string | null
          plan: Plan
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
      }
      bot_conversations: {
        Row: {
          id: string
          user_id: string
          cliente_phone: string
          mensajes: unknown[]
          producto_consultado: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bot_conversations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bot_conversations']['Insert']>
      }
    }
  }
}
