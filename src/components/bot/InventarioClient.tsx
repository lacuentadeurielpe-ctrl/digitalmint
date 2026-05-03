'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Producto {
  id: string
  nombre_producto: string | null
  subtitulo: string | null
  tipo_producto: string | null
  precio_sugerido: number | null
}

interface ItemInventario {
  id: string
  precio_venta: number
  precio_tachado: number | null
  enlace_entrega: string | null
  multimedia_urls: string[]
  prueba_social: string | null
  escasez_texto: string | null
  activo: boolean
  leads: number
  conversiones: number
  products: Producto
}

interface Props {
  items: ItemInventario[]
  productosDisponibles: Producto[]
}

export default function InventarioClient({ items: initial, productosDisponibles }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state for editing
  const [form, setForm] = useState({
    precio_venta: '',
    precio_tachado: '',
    enlace_entrega: '',
    multimedia_url: '',
    prueba_social: '',
    escasez_texto: '',
  })

  // New item form
  const [newForm, setNewForm] = useState({
    product_id: '',
    precio_venta: '',
    precio_tachado: '',
    enlace_entrega: '',
    multimedia_url: '',
    prueba_social: '',
    escasez_texto: '',
  })

  function startEdit(item: ItemInventario) {
    setEditing(item.id)
    setForm({
      precio_venta: String(item.precio_venta),
      precio_tachado: item.precio_tachado ? String(item.precio_tachado) : '',
      enlace_entrega: item.enlace_entrega ?? '',
      multimedia_url: item.multimedia_urls[0] ?? '',
      prueba_social: item.prueba_social ?? '',
      escasez_texto: item.escasez_texto ?? '',
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch(`/api/bot/inventario/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        precio_venta: Number(form.precio_venta),
        precio_tachado: form.precio_tachado ? Number(form.precio_tachado) : null,
        enlace_entrega: form.enlace_entrega || null,
        multimedia_urls: form.multimedia_url ? [form.multimedia_url] : [],
        prueba_social: form.prueba_social || null,
        escasez_texto: form.escasez_texto || null,
      }),
    })
    if (res.ok) {
      router.refresh()
      setEditing(null)
    }
    setSaving(false)
  }

  async function toggleActivo(item: ItemInventario) {
    await fetch(`/api/bot/inventario/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !item.activo }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: !i.activo } : i))
  }

  async function eliminar(id: string) {
    setDeleting(id)
    await fetch(`/api/bot/inventario/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  async function agregarProducto() {
    if (!newForm.product_id || !newForm.precio_venta) return
    setSaving(true)
    const res = await fetch('/api/bot/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: newForm.product_id,
        precio_venta: Number(newForm.precio_venta),
        precio_tachado: newForm.precio_tachado ? Number(newForm.precio_tachado) : null,
        enlace_entrega: newForm.enlace_entrega || null,
        multimedia_urls: newForm.multimedia_url ? [newForm.multimedia_url] : [],
        prueba_social: newForm.prueba_social || null,
        escasez_texto: newForm.escasez_texto || null,
      }),
    })
    if (res.ok) {
      router.refresh()
      setShowAdd(false)
      setNewForm({ product_id: '', precio_venta: '', precio_tachado: '', enlace_entrega: '', multimedia_url: '', prueba_social: '', escasez_texto: '' })
    }
    setSaving(false)
  }

  const yaEnInventario = new Set(items.map(i => i.products.id))
  const disponibles = productosDisponibles.filter(p => !yaEnInventario.has(p.id))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{items.length} producto{items.length !== 1 ? 's' : ''} en el inventario del bot</p>
        {disponibles.length > 0 && (
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-medium hover:bg-purple-600/30 transition"
          >
            {showAdd ? '✕ Cancelar' : '+ Agregar producto'}
          </button>
        )}
      </div>

      {/* Formulario agregar */}
      {showAdd && (
        <div className="p-5 bg-slate-800/60 border border-purple-500/20 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-purple-300 mb-1">Activar producto para el bot</p>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Producto</label>
            <select
              value={newForm.product_id}
              onChange={e => {
                const p = disponibles.find(x => x.id === e.target.value)
                setNewForm(f => ({
                  ...f,
                  product_id: e.target.value,
                  precio_venta: p?.precio_sugerido ? String(p.precio_sugerido) : f.precio_venta,
                }))
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">— Elige un producto —</option>
              {disponibles.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_producto}</option>
              ))}
            </select>
          </div>
          <FormFields form={newForm} onChange={(k, v) => setNewForm(f => ({ ...f, [k]: v }))} />
          <button
            onClick={agregarProducto}
            disabled={saving || !newForm.product_id || !newForm.precio_venta}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Activar en el bot'}
          </button>
        </div>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-slate-400 text-sm">No hay productos en el inventario.</p>
          <p className="text-slate-600 text-xs mt-1">Agrega un producto para que el bot pueda venderlo.</p>
        </div>
      ) : (
        items.map(item => (
          <div key={item.id} className={`rounded-xl border p-5 transition ${item.activo ? 'bg-slate-800/50 border-white/5' : 'bg-slate-900/30 border-white/3 opacity-60'}`}>
            {editing === item.id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-white text-sm">{item.products.nombre_producto}</p>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item.id)} disabled={saving} className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-medium disabled:opacity-50">
                      {saving ? '...' : 'Guardar'}
                    </button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs">Cancelar</button>
                  </div>
                </div>
                <FormFields form={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${item.activo ? 'bg-green-400' : 'bg-slate-600'}`} />
                    <p className="text-sm font-semibold text-white truncate">{item.products.nombre_producto}</p>
                    {item.products.tipo_producto && (
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded capitalize">{item.products.tipo_producto}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    {item.precio_tachado && <span className="line-through">${item.precio_tachado}</span>}
                    <span className="text-green-400 font-semibold text-sm">${item.precio_venta}</span>
                    {item.enlace_entrega && <span className="text-blue-400">🔗 Link entrega</span>}
                    {item.multimedia_urls.length > 0 && <span>🖼 {item.multimedia_urls.length} imagen{item.multimedia_urls.length > 1 ? 'es' : ''}</span>}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500">Leads: <span className="text-white font-medium">{item.leads}</span></span>
                    <span className="text-slate-500">Ventas: <span className="text-green-400 font-medium">{item.conversiones}</span></span>
                    {item.leads > 0 && (
                      <span className="text-slate-500">Conv: <span className="text-purple-400 font-medium">{Math.round((item.conversiones / item.leads) * 100)}%</span></span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActivo(item)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition ${item.activo ? 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-green-500/30 hover:text-green-300'}`}
                  >
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => startEdit(item)} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition">
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => eliminar(item.id)}
                    disabled={deleting === item.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition disabled:opacity-50"
                  >
                    {deleting === item.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function FormFields({ form, onChange }: {
  form: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Precio de venta (USD) *</label>
        <input type="number" value={form.precio_venta} onChange={e => onChange('precio_venta', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="97" />
      </div>
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Precio tachado (anchor)</label>
        <input type="number" value={form.precio_tachado} onChange={e => onChange('precio_tachado', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="297" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">Link de entrega (URL de acceso al producto)</label>
        <input type="url" value={form.enlace_entrega} onChange={e => onChange('enlace_entrega', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="https://..." />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">URL de imagen del producto (para enviar en WhatsApp)</label>
        <input type="url" value={form.multimedia_url} onChange={e => onChange('multimedia_url', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="https://..." />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">Prueba social (texto de testimonio)</label>
        <input type="text" value={form.prueba_social} onChange={e => onChange('prueba_social', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder='"Conseguí 3 clientes en 2 semanas" — Ana García' />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-slate-400 mb-1 block">Texto de escasez/urgencia</label>
        <input type="text" value={form.escasez_texto} onChange={e => onChange('escasez_texto', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Solo 10 accesos disponibles este mes" />
      </div>
    </div>
  )
}
