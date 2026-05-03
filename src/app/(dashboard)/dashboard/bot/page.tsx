import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BotDashboardClient from '@/components/bot/BotDashboardClient'

export default async function BotPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const [settingsRes, convsRes, pagosRes] = await Promise.all([
    admin.from('user_settings')
      .select('bot_activo, bot_phone, yape_numero, plin_numero, bcp_cuenta')
      .eq('user_id', user!.id)
      .maybeSingle(),

    admin.from('bot_conversations')
      .select(`id, cliente_phone, nombre_cliente, estado, agente_actual, pausado,
               updated_at, inventario_bot(products(nombre_producto))`)
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(30),

    admin.from('pagos_pendientes')
      .select(`id, monto, metodo, numero_operacion, comprobante_url, estado, created_at,
               bot_conversations(cliente_phone, nombre_cliente),
               inventario_bot(products(nombre_producto))`)
      .eq('user_id', user!.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false }),
  ])

  const settings = settingsRes.data as any
  const convs = (convsRes.data ?? []) as any[]
  const pagos = (pagosRes.data ?? []) as any[]

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/ycloud`
  const botConfigurado = !!(settings?.bot_phone && settings?.bot_activo)
  const pagosConfigurados = !!(settings?.yape_numero || settings?.plin_numero || settings?.bcp_cuenta)

  return (
    <BotDashboardClient
      botConfigurado={botConfigurado}
      pagosConfigurados={pagosConfigurados}
      botPhone={settings?.bot_phone ?? null}
      webhookUrl={webhookUrl}
      conversaciones={convs}
      pagos={pagos}
    />
  )
}
