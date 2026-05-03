import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInvestigador } from '@/lib/ai/investigador'
import { runEstrateга } from '@/lib/ai/estratega'
import { runArquitecto } from '@/lib/ai/arquitecto'
import { runEscritores } from '@/lib/ai/escritores'
import { runEditor } from '@/lib/ai/editor'
import { runVendedor } from '@/lib/ai/vendedor'
import type { InvestigadorOutput } from '@/lib/ai/investigador'
import type { EstrategaOutput } from '@/lib/ai/estratega'
import type { ArquitectoOutput } from '@/lib/ai/arquitecto'

export const maxDuration = 60

async function runWithRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { lastErr = e }
  }
  throw lastErr
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { productId, agente } = await req.json()
  if (!productId || !agente) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: product } = await admin
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', user.id)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  try {
    // ── AGENTE 1: Investigador (GPT-4o-mini) ──
    if (agente === 1) {
      await admin.from('products').update({ current_agent: 1, status: 'generating' }).eq('id', productId)
      const output = await runWithRetry(() => runInvestigador(product.idea_original))
      await admin.from('products').update({ investigador_output: output }).eq('id', productId)
      return NextResponse.json({ ok: true, next: 2 })
    }

    // ── AGENTE 2: Estratega (DeepSeek) ──
    if (agente === 2) {
      await admin.from('products').update({ current_agent: 2 }).eq('id', productId)
      const output = await runWithRetry(() =>
        runEstrateга(product.idea_original, product.investigador_output as InvestigadorOutput)
      )
      await admin.from('products').update({
        estratega_output: output,
        nombre_producto: output.nombre_producto,
        subtitulo: output.subtitulo,
        promesa_before: output.promesa_before,
        promesa_after: output.promesa_after,
        avatar_cliente: output.avatar,
        precio_sugerido: output.precio_principal,
        tipo_producto: output.tipo_producto,
        estrategia_precio: {
          precio_anchor: output.precio_anchor,
          precio_principal: output.precio_principal,
          precio_downsell: output.precio_downsell,
          justificacion: output.justificacion_precio,
        },
      }).eq('id', productId)
      return NextResponse.json({ ok: true, next: 3 })
    }

    // ── AGENTE 3: Arquitecto (DeepSeek) — Bible + Section Briefs ──
    if (agente === 3) {
      await admin.from('products').update({ current_agent: 3 }).eq('id', productId)
      const output = await runWithRetry(() =>
        runArquitecto(
          product.idea_original,
          product.investigador_output as InvestigadorOutput,
          product.estratega_output as EstrategaOutput
        )
      )
      // Derive estructura_producto from secciones for UI compatibility
      const estructura = {
        tipo: output.estructura_descripcion,
        modulos: output.secciones.map(s => ({
          numero: s.orden,
          titulo: s.titulo,
          descripcion: s.brief.slice(0, 150),
          transformacion: s.puntos_clave[0] ?? '',
          es_pareto: s.es_pareto,
        })),
      }
      await admin.from('products').update({
        arquitecto_output: output,
        bible: output.bible,
        tipo_producto: output.tipo_producto,
        estructura_producto: estructura,
      }).eq('id', productId)
      return NextResponse.json({ ok: true, next: 4 })
    }

    // ── AGENTE 4: Escritores paralelos (DeepSeek) ──
    if (agente === 4) {
      await admin.from('products').update({ current_agent: 4 }).eq('id', productId)

      const arquitecto = product.arquitecto_output as ArquitectoOutput
      const estratega = product.estratega_output as EstrategaOutput

      // Clear any existing content (retry safety)
      await admin.from('producto_contenido').delete().eq('product_id', productId)

      const secciones = await runWithRetry(() =>
        runEscritores(
          arquitecto.bible,
          arquitecto.secciones,
          estratega.nombre_producto,
          estratega.subtitulo
        )
      )

      const rows = secciones.map(s => ({
        product_id: productId,
        user_id: user.id,
        orden: s.orden,
        tipo_seccion: s.tipo_seccion,
        titulo: s.titulo,
        contenido: s.contenido,
        palabras_count: s.palabras_count,
      }))

      await admin.from('producto_contenido').insert(rows)

      const totalPalabras = secciones.reduce((sum, s) => sum + s.palabras_count, 0)
      await admin.from('products').update({ tamano_total_palabras: totalPalabras }).eq('id', productId)

      return NextResponse.json({ ok: true, next: 5 })
    }

    // ── AGENTE 5: Editor Jefe (DeepSeek) — Intro + Conclusion + TOC ──
    if (agente === 5) {
      await admin.from('products').update({ current_agent: 5 }).eq('id', productId)

      const arquitecto = product.arquitecto_output as ArquitectoOutput
      const estratega = product.estratega_output as EstrategaOutput

      const extras = await runWithRetry(() =>
        runEditor(
          arquitecto.bible,
          arquitecto.secciones,
          estratega.nombre_producto,
          estratega.subtitulo
        )
      )

      const rows = extras.map(e => ({
        product_id: productId,
        user_id: user.id,
        orden: e.orden,
        tipo_seccion: e.tipo_seccion,
        titulo: e.titulo,
        contenido: e.contenido,
        palabras_count: e.palabras_count,
      }))

      await admin.from('producto_contenido').insert(rows)

      const extraWords = extras.reduce((sum, e) => sum + e.palabras_count, 0)
      const current = (product.tamano_total_palabras as number) ?? 0
      await admin.from('products').update({
        tamano_total_palabras: current + extraWords,
      }).eq('id', productId)

      return NextResponse.json({ ok: true, next: 6 })
    }

    // ── AGENTE 6: Vendedor (Claude Sonnet) — WhatsApp Scripts ──
    if (agente === 6) {
      await admin.from('products').update({ current_agent: 6 }).eq('id', productId)
      const output = await runWithRetry(() =>
        runVendedor(
          product.investigador_output as InvestigadorOutput,
          product.estratega_output as EstrategaOutput,
          product.arquitecto_output as ArquitectoOutput
        )
      )
      await admin.from('products').update({
        vendedor_output: output,
        // Keep ganchos_redes for backward compat (use FB hooks)
        ganchos_redes: output.ganchos_facebook,
        status: 'complete',
        current_agent: 6,
      }).eq('id', productId)
      return NextResponse.json({ ok: true, next: null })
    }

    return NextResponse.json({ error: 'Agente inválido' }, { status: 400 })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en el agente'
    console.error(`[Agente ${agente}] Error:`, message)
    await admin.from('products').update({ status: 'failed' }).eq('id', productId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
