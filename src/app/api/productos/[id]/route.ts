import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // Verify ownership before deleting anything
  const { data: product } = await admin
    .from('products')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  // Delete children first, then the product
  await admin.from('producto_contenido').delete().eq('product_id', params.id)
  await admin.from('product_exports').delete().eq('product_id', params.id)
  await admin.from('products').delete().eq('id', params.id).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
