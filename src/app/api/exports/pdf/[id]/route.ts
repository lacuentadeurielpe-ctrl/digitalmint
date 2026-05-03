import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { ProductoPDF } from '@/lib/pdf/producto-pdf'
import type { AvatarCliente, EstrategiaPrecio } from '@/lib/supabase/types'
import type { SeccionContenido, PdfTheme } from '@/lib/pdf/producto-pdf'
import { createElement } from 'react'

export const maxDuration = 60

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return new Response('No autorizado', { status: 401 })

  const { data: raw } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'complete')
    .single()

  if (!raw) return new Response('Producto no encontrado', { status: 404 })

  const p = raw as any
  const admin = createAdminClient()

  const { data: contenido } = await admin
    .from('producto_contenido')
    .select('orden, tipo_seccion, titulo, contenido, palabras_count')
    .eq('product_id', p.id)
    .order('orden', { ascending: true })

  // Parse personalization query params
  const url = new URL(req.url)
  const theme = (url.searchParams.get('theme') ?? 'dark') as PdfTheme
  const footerText  = url.searchParams.get('footer')   ?? undefined
  const customTitle = url.searchParams.get('title')    ?? undefined
  const customSub   = url.searchParams.get('subtitle') ?? undefined
  const showTransformation = url.searchParams.get('transformation') === '1'
  const showAvatar         = url.searchParams.get('avatar')         === '1'
  const showScripts        = url.searchParams.get('scripts')        === '1'
  const showGanchos        = url.searchParams.get('ganchos')        === '1'

  await admin.from('product_exports').insert({
    product_id: p.id,
    user_id: user.id,
    tipo: 'pdf',
  })

  const element = createElement(ProductoPDF as any, {
    nombre_producto:      p.nombre_producto ?? 'Mi Producto',
    subtitulo:            p.subtitulo,
    promesa_before:       p.promesa_before,
    promesa_after:        p.promesa_after,
    avatar:               p.avatar_cliente as AvatarCliente | null,
    precio:               p.estrategia_precio as EstrategiaPrecio | null,
    precio_sugerido:      p.precio_sugerido,
    tipo_producto:        p.tipo_producto ?? null,
    tamano_total_palabras: p.tamano_total_palabras ?? null,
    secciones:            (contenido ?? []) as SeccionContenido[],
    ganchos:              p.ganchos_redes as string[] | null,
    vendedor_output:      p.vendedor_output as Record<string, unknown> | null,
    // Personalization
    theme,
    footerText,
    customTitle,
    customSubtitle: customSub,
    showTransformation,
    showAvatar,
    showScripts,
    showGanchos,
  })

  const pdfBuffer = await renderToBuffer(element as any)

  const titleForFile = customTitle || p.nombre_producto || 'producto'
  const filename = `${titleForFile.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`

  return new Response(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
