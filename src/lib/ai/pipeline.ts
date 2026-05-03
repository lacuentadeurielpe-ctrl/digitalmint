import { createAdminClient } from '@/lib/supabase/admin'
import { runInvestigador } from './investigador'
import { runEstrategа } from './estratega'
import { runCreador } from './creador'
import { runVendedor } from './vendedor'

export type PipelineEvent =
  | { type: 'agent_start'; agent: number; label: string }
  | { type: 'agent_done'; agent: number; label: string }
  | { type: 'complete'; productId: string }
  | { type: 'error'; message: string }

export async function runPipeline(
  productId: string,
  idea: string,
  onEvent: (event: PipelineEvent) => void
) {
  const supabase = createAdminClient()

  try {
    // Agente 1: Investigador
    onEvent({ type: 'agent_start', agent: 1, label: 'Investigador' })
    const investigador = await runInvestigador(idea)
    await supabase
      .from('products')
      .update({ investigador_output: investigador, current_agent: 1 })
      .eq('id', productId)
    onEvent({ type: 'agent_done', agent: 1, label: 'Investigador' })

    // Agente 2: Estratega
    onEvent({ type: 'agent_start', agent: 2, label: 'Estratega' })
    const estratega = await runEstrategа(idea, investigador)
    await supabase
      .from('products')
      .update({
        estratega_output: estratega,
        current_agent: 2,
        nombre_producto: estratega.nombre_producto,
        subtitulo: estratega.subtitulo,
        promesa_before: estratega.promesa_before,
        promesa_after: estratega.promesa_after,
        avatar_cliente: estratega.avatar,
        precio_sugerido: estratega.precio_principal,
        estrategia_precio: {
          precio_anchor: estratega.precio_anchor,
          precio_principal: estratega.precio_principal,
          precio_downsell: estratega.precio_downsell,
          justificacion: estratega.justificacion_precio,
        },
      })
      .eq('id', productId)
    onEvent({ type: 'agent_done', agent: 2, label: 'Estratega' })

    // Agente 3: Creador
    onEvent({ type: 'agent_start', agent: 3, label: 'Creador' })
    const creador = await runCreador(idea, investigador, estratega)
    await supabase
      .from('products')
      .update({
        creador_output: creador,
        current_agent: 3,
        estructura_producto: {
          tipo: creador.tipo_estructura,
          modulos: creador.modulos,
        },
      })
      .eq('id', productId)
    onEvent({ type: 'agent_done', agent: 3, label: 'Creador' })

    // Agente 4: Vendedor
    onEvent({ type: 'agent_start', agent: 4, label: 'Vendedor' })
    const vendedor = await runVendedor(investigador, estratega, creador)
    await supabase
      .from('products')
      .update({
        vendedor_output: vendedor,
        current_agent: 4,
        pagina_ventas: vendedor.pagina_ventas,
        ganchos_redes: vendedor.ganchos_redes,
        status: 'complete',
        titulo: estratega.nombre_producto,
      })
      .eq('id', productId)
    onEvent({ type: 'agent_done', agent: 4, label: 'Vendedor' })

    onEvent({ type: 'complete', productId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await supabase
      .from('products')
      .update({ status: 'failed' })
      .eq('id', productId)
    onEvent({ type: 'error', message })
  }
}
