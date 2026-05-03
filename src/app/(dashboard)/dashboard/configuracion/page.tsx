import { createClient } from '@/lib/supabase/server'
import BotConfigClient from '@/components/configuracion/BotConfigClient'
import WebhookConfigClient from '@/components/configuracion/WebhookConfigClient'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const s = settings as any

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 mt-1">Gestiona tu cuenta y las integraciones</p>
      </div>

      {/* Cuenta */}
      <Section title="👤 Cuenta">
        <div className="space-y-3">
          <Info label="Email" value={user!.email ?? '—'} />
          <Info label="Plan" value={s?.plan ?? 'free'} badge />
          <Info label="Miembro desde" value={new Date(user!.created_at).toLocaleDateString('es-PE')} />
        </div>
      </Section>

      {/* WhatsApp Bot */}
      <Section title="💬 Bot de WhatsApp">
        <p className="text-sm text-slate-400 mb-4">
          Conecta tu número de WhatsApp para activar el bot que responde consultas sobre tus productos digitales.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div>
              <p className="text-sm text-white">Estado del bot</p>
              <p className="text-xs text-slate-500">{s?.bot_activo ? 'Activo y respondiendo' : 'Inactivo'}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              s?.bot_activo ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'
            }`}>
              {s?.bot_activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Número de WhatsApp</p>
            <p className="text-sm text-slate-300">{s?.bot_phone || 'No configurado'}</p>
          </div>
          <BotConfigClient
            botActivo={s?.bot_activo ?? false}
            botPhone={s?.bot_phone ?? ''}
            yclouKey={s?.ycloud_api_key ?? ''}
            userId={user!.id}
          />
        </div>
      </Section>

      {/* Webhooks de exportación */}
      <Section title="🔗 Webhooks de exportación">
        <p className="text-sm text-slate-400 mb-4">
          Cuando exportes un producto, se enviará automáticamente a estas URLs con todos los datos generados por IA.
          Compatible con Gumroad, Hotmart, Stripe, Make, Zapier o cualquier endpoint HTTP.
        </p>
        <WebhookConfigClient
          userId={user!.id}
          webhookGumroad={s?.webhook_gumroad ?? ''}
          webhookHotmart={s?.webhook_hotmart ?? ''}
          webhookStripe={s?.webhook_stripe ?? ''}
          webhookCustom={s?.webhook_custom ?? ''}
        />
      </Section>

      {/* Peligro */}
      <Section title="⚠️ Zona peligrosa">
        <p className="text-sm text-slate-400 mb-4">
          Las siguientes acciones son irreversibles.
        </p>
        <button
          disabled
          className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm opacity-50 cursor-not-allowed"
        >
          Eliminar cuenta (próximamente)
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 bg-slate-800/50 border border-white/5 rounded-xl p-6">
      <h2 className="font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Info({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      {badge ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium uppercase">
          {value}
        </span>
      ) : (
        <span className="text-sm text-slate-300">{value}</span>
      )}
    </div>
  )
}
