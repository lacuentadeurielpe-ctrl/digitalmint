import { createClient } from '@/lib/supabase/server'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single()

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
          <Info label="Plan" value={settings?.plan ?? 'free'} badge />
          <Info label="Miembro desde" value={new Date(user!.created_at).toLocaleDateString('es-PE')} />
        </div>
      </Section>

      {/* WhatsApp Bot */}
      <Section title="💬 Bot de WhatsApp">
        <p className="text-sm text-slate-400 mb-4">
          Conecta tu número de WhatsApp para activar el bot que responde consultas sobre tus productos digitales.
        </p>
        <BotConfigForm
          botActivo={settings?.bot_activo ?? false}
          botPhone={settings?.bot_phone ?? ''}
          yclouKey={settings?.ycloud_api_key ?? ''}
          userId={user!.id}
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

function BotConfigForm({ botActivo, botPhone, yclouKey, userId }: {
  botActivo: boolean
  botPhone: string
  yclouKey: string
  userId: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
        <div>
          <p className="text-sm text-white">Estado del bot</p>
          <p className="text-xs text-slate-500">{botActivo ? 'Activo y respondiendo' : 'Inactivo'}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          botActivo ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'
        }`}>
          {botActivo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Número de WhatsApp</p>
        <p className="text-sm text-slate-300">{botPhone || 'No configurado'}</p>
      </div>
      <BotConfigClient botActivo={botActivo} botPhone={botPhone} yclouKey={yclouKey} userId={userId} />
    </div>
  )
}

// Client component para el formulario interactivo
import BotConfigClient from '@/components/configuracion/BotConfigClient'
