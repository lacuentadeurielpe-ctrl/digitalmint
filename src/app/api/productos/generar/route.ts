import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { idea } = await req.json()
  if (!idea?.trim()) {
    return NextResponse.json({ error: 'La idea es requerida' }, { status: 400 })
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      user_id: user.id,
      idea_original: idea.trim(),
      status: 'generating',
      current_agent: 0,
    })
    .select('id')
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Error creando producto' }, { status: 500 })
  }

  return NextResponse.json({ productId: product.id })
}
