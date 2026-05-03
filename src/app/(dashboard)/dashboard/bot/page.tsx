import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function BotPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: settings }, { data: conversations }] = await Promise.all([
    supabase.from('user_settings').select('bot_activo, bot_phone').eq('user_id', user!.id).single(),
    supabase
      .from('bot_conversations')
      .select('id, cliente_phone, created_at, updated_at, producto_consultado')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(20),
  ])

  const botConfigurado = settings?.bot_phone && settings?.bot_activo

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Bot de WhatsApp</h1>
          <p className="text-slate-400 mt-1">Tu agente de ventas automatizado</p>
        </div>
        <Link
          href="/dashboard/configuracion"
          className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:border-purple-500/50 hover:text-white transition"
        >
          ⚙️ Configurar bot
        </Link>
      </div>

      {/* Estado del bot */}
      <div className={`mb-6 p-5 rounded-xl border ${
        botConfigurado
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{botConfigurado ? '🟢' : '🟡'}</span>
          <div>
            <p className={`font-semibold ${botConfigurado ? 'text-green-300' : 'text-yellow-300'}`}>
              {botConfigurado ? 'Bot activo' : 'Bot no configurado'}
            </p>
            <p className="text-sm text-slate-400">
              {botConfigurado
                ? `Respondiendo en +${settings.bot_phone}`
                : 'Ve a Configuración para conectar tu número de WhatsApp'}
            </p>
          </div>
        </div>
      </div>

      {/* Webhook info */}
      <div className="mb-6 bg-slate-800/50 border border-white/5 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">📡 Webhook de YCloud</h2>
        <p className="text-xs text-slate-500 mb-2">
          Configura esta URL en tu cuenta de YCloud como webhook de mensajes entrantes:
        </p>
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
          <code className="text-xs text-purple-300 flex-1 truncate">
            {process.env.NEXT_PUBLIC_APP_URL}/api/webhook/ycloud
          </code>
        </div>
      </div>

      {/* Conversaciones */}
      <div className="bg-slate-800/50 border border-white/5 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">💬 Conversaciones recientes</h2>
        {!conversations || conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">
              {botConfigurado
                ? 'Aún no hay conversaciones. Las verás aquí cuando lleguen mensajes.'
                : 'Configura el bot para comenzar a recibir consultas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(conversations as any[]).map((conv) => (
              <div key={conv.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
                <div>
                  <p className="text-sm text-white font-medium">+{conv.cliente_phone}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(conv.updated_at).toLocaleString('es-PE')}
                  </p>
                </div>
                {conv.producto_consultado && (
                  <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                    Con producto
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
