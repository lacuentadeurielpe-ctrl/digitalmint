import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInvestigador } from '@/lib/ai/investigador'
import { runEstrategа } from '@/lib/ai/estratega'
import { runCreador } from '@/lib/ai/creador'
import { runVendedor } from '@/lib/ai/vendedor'
import type { InvestigadorOutput } from '@/lib/ai/investigador'
import type { EstrategaOutput } from '@/lib/ai/estratega'
import type { CreadorOutput } from '@/lib/ai/creador'

// Cada agente individual corre en su propia llamada (<= 60s en Hobby)
export const maxDuration = 60

export async function POST(req: Request) {
  const { productId, agente } = await req.json()
  if (!productId || !agente) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  try {
    if (agente === 1) {
      await supabase.from('products').update({ current_agent: 1 }).eq('id', productId)
      const output = await runInvestigador(product.idea_original)
      await supabase.from('products').update({ investigador_output: output }).eq('id', productId)
      return NextResponse.json({ ok: true, next: 2 })
    }

    if (agente === 2) {
      await supabase.from('products').update({ current_agent: 2 }).eq('id', productId)
      const output = await runEstrategа(
        product.idea_original,
        product.investigador_output as InvestigadorOutput
      )
      await supabase.from('products').update({
        estratega_output: output,
        nombre_producto: output.nombre_producto,
        subtitulo: output.subtitulo,
        promesa_before: output.promesa_before,
        promesa_after: output.promesa_after,
        avatar_cliente: output.avatar,
        precio_sugerido: output.precio_principal,
        estrategia_precio: {
          precio_anchor: output.precio_anchor,
          precio_principal: output.precio_principal,
          precio_downsell: output.precio_downsell,
          justificacion: output.justificacion_precio,
        },
      }).eq('id', productId)
      return NextResponse.json({ ok: true, next: 3 })
    }

    if (agente === 3) {
      await supabase.from('products').update({ current_agent: 3 }).eq('id', productId)
      const output = await runCreador(
        product.idea_original,
        product.investigador_output as InvestigadorOutput,
        product.estratega_output as EstrategaOutput
      )
      await supabase.from('products').update({
        creador_output: output,
        estructura_producto: { tipo: output.tipo_estructura, modulos: output.modulos },
      }).eq('id', productId)
      return NextResponse.json({ ok: true, next: 4 })
    }

    if (agente === 4) {
      await supabase.from('products').update({ current_agent: 4 }).eq('id', productId)
      const output = await runVendedor(
        product.investigador_output as InvestigadorOutput,
        product.estratega_output as EstrategaOutput,
        product.creador_output as CreadorOutput
      )
      await supabase.from('products').update({
        vendedor_output: output,
        pagina_ventas: output.pagina_ventas,
        ganchos_redes: output.ganchos_redes,
        titulo: product.nombre_producto,
        status: 'complete',
      }).eq('id', productId)
      return NextResponse.json({ ok: true, next: null })
    }

    return NextResponse.json({ error: 'Agente inválido' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en el agente'
    console.error(`[Agente ${agente}] Error:`, message)

    // Solo marcar como fallido si es el último intento
    await supabase.from('products').update({ status: 'failed' }).eq('id', productId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
