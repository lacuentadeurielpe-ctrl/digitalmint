import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { pausado } = await req.json() as { pausado: boolean }

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('bot_conversations')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await admin
    .from('bot_conversations')
    .update({ pausado, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, pausado })
}
