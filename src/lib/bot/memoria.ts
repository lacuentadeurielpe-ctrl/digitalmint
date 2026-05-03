// Perfil del cliente — aprendizaje pasivo entre conversaciones
//
// Se actualiza cuando el cliente dice algo relevante sobre sí mismo.
// NUNCA se menciona al cliente que lo recordamos — es contexto interno.

import { createAdminClient } from '@/lib/supabase/admin'

export interface PerfilCliente {
  objetivo_principal?: string      // "quiero monetizar mi conocimiento", "aprender a invertir"
  objecion_principal?: string      // "el precio", "no tengo tiempo", "desconfía"
  productos_comprados?: string[]   // nombres de productos que ya compró
  productos_vistos?: string[]      // productos por los que preguntó sin comprar
  estilo?: 'formal' | 'casual'     // cómo escribe el cliente
  referido_por?: string            // "instagram", "tiktok", "amigo"
  nivel_conocimiento?: string      // "principiante", "intermedio", "avanzado"
}

/** Carga el perfil guardado de la conversación */
export async function cargarPerfil(conversacionId: string): Promise<PerfilCliente> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bot_conversations')
    .select('perfil_cliente')
    .eq('id', conversacionId)
    .single()
  return ((data as any)?.perfil_cliente as PerfilCliente) ?? {}
}

/** Actualiza campos del perfil (merge — no sobreescribe todo) */
export async function actualizarPerfil(
  conversacionId: string,
  cambios: Partial<PerfilCliente>,
): Promise<void> {
  const admin = createAdminClient()
  const actual = await cargarPerfil(conversacionId)
  const merged: PerfilCliente = {
    ...actual,
    ...cambios,
    // Arrays: merge sin duplicados
    productos_comprados: Array.from(
      new Set([...(actual.productos_comprados ?? []), ...(cambios.productos_comprados ?? [])])
    ),
    productos_vistos: Array.from(
      new Set([...(actual.productos_vistos ?? []), ...(cambios.productos_vistos ?? [])])
    ),
  }
  await admin
    .from('bot_conversations')
    .update({ perfil_cliente: merged, updated_at: new Date().toISOString() })
    .eq('id', conversacionId)
}

/**
 * Analiza el mensaje del cliente e infiere actualizaciones al perfil.
 * Se llama después de cada turno — fire & forget (no bloquea la respuesta).
 */
export async function inferirYActualizarPerfil(params: {
  conversacionId: string
  mensaje: string
  productoNombre?: string
  estadoNuevo?: string
}): Promise<void> {
  const { conversacionId, mensaje, productoNombre, estadoNuevo } = params
  const cambios: Partial<PerfilCliente> = {}

  // Detectar estilo de comunicación
  if (/[!]{2,}|jaja|xd|hola!|q tal/i.test(mensaje)) cambios.estilo = 'casual'
  else if (/estimado|buenos días|buenas tardes|cordialmente/i.test(mensaje)) cambios.estilo = 'formal'

  // Detectar fuente de referencia
  if (/instagram|ig\b/i.test(mensaje)) cambios.referido_por = 'instagram'
  else if (/tiktok|tik tok/i.test(mensaje)) cambios.referido_por = 'tiktok'
  else if (/youtube|yt\b/i.test(mensaje)) cambios.referido_por = 'youtube'
  else if (/amigo|me\s+recomend[oó]/i.test(mensaje)) cambios.referido_por = 'referido'

  // Detectar objeción principal
  if (/caro|mucho\s+dinero|no\s+tengo\s+plata|no\s+puedo\s+pagar/i.test(mensaje))
    cambios.objecion_principal = 'precio'
  else if (/no\s+tengo\s+tiempo|muy\s+ocupado|no\s+s[eé]\s+si\s+pueda/i.test(mensaje))
    cambios.objecion_principal = 'tiempo'
  else if (/no\s+s[eé]\s+si\s+funciona|cómo\s+sé\s+que|garantía|seguro/i.test(mensaje))
    cambios.objecion_principal = 'desconfianza'

  // Detectar nivel de conocimiento
  if (/soy\s+nuevo|nunca\s+he|no\s+s[eé]\s+nada|principiante/i.test(mensaje))
    cambios.nivel_conocimiento = 'principiante'
  else if (/ya\s+(sé|sé|tengo|hice)|tengo\s+experiencia/i.test(mensaje))
    cambios.nivel_conocimiento = 'intermedio'

  // Marcar producto como visto
  if (productoNombre) {
    cambios.productos_vistos = [productoNombre]
  }

  // Marcar como comprado si la conversación llegó a 'cliente'
  if (estadoNuevo === 'cliente' && productoNombre) {
    cambios.productos_comprados = [productoNombre]
  }

  if (Object.keys(cambios).length > 0) {
    actualizarPerfil(conversacionId, cambios).catch(() => {})
  }
}

/** Convierte el perfil a texto para incluir en el prompt del agente */
export function perfilATexto(perfil: PerfilCliente): string {
  const partes: string[] = []
  if (perfil.objetivo_principal) partes.push(`Objetivo: ${perfil.objetivo_principal}`)
  if (perfil.objecion_principal) partes.push(`Objeción conocida: ${perfil.objecion_principal}`)
  if (perfil.estilo) partes.push(`Estilo de comunicación: ${perfil.estilo}`)
  if (perfil.nivel_conocimiento) partes.push(`Nivel: ${perfil.nivel_conocimiento}`)
  if (perfil.referido_por) partes.push(`Llegó por: ${perfil.referido_por}`)
  if (perfil.productos_comprados?.length)
    partes.push(`Ya compró: ${perfil.productos_comprados.join(', ')}`)
  if (perfil.productos_vistos?.length)
    partes.push(`Ha preguntado por: ${perfil.productos_vistos.join(', ')}`)
  return partes.length ? partes.join('\n') : ''
}
