import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/ai/pipeline'

export const maxDuration = 300

function sseMsg(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('No autorizado', { status: 401 })
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, user_id, idea_original, status')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!product) {
    return new Response('Producto no encontrado', { status: 404 })
  }

  // Si ya está completo o fallido, devuelve estado inmediatamente
  if (product.status === 'complete' || product.status === 'failed') {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            sseMsg(product.status === 'complete' ? 'complete' : 'error', {
              productId: product.id,
              message: product.status === 'failed' ? 'El producto ya falló' : undefined,
            })
          )
        )
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {

      // Keepalive cada 20s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {}
      }, 20000)

      runPipeline(product.id, product.idea_original, (event) => {
        try {
          controller.enqueue(encoder.encode(sseMsg(event.type, event)))
          if (event.type === 'complete' || event.type === 'error') {
            clearInterval(keepalive)
            controller.close()
          }
        } catch {}
      }).catch(() => {
        clearInterval(keepalive)
        try {
          controller.enqueue(
            encoder.encode(sseMsg('error', { message: 'Pipeline falló' }))
          )
          controller.close()
        } catch {}
      })
    },
    cancel() {},
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
