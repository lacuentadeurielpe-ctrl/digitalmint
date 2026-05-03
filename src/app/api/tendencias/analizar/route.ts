import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runTendencias } from '@/lib/ai/tendencias'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { categoria = 'todos' } = await req.json().catch(() => ({}))

  try {
    const output = await runTendencias(categoria)
    return NextResponse.json(output)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error en el análisis'
    console.error('[Tendencias] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
