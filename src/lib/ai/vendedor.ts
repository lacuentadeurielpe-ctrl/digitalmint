import Anthropic from '@anthropic-ai/sdk'
import type { InvestigadorOutput } from './investigador'
import type { EstrategaOutput } from './estratega'
import type { CreadorOutput } from './creador'

export interface VendedorOutput {
  pagina_ventas: string
  ganchos_redes: [string, string, string]
  email_lanzamiento: string
}

const SYSTEM_PROMPT = `Eres el copywriter de conversión más peligroso del mundo hispanohablante. Tu copy vende porque:

MARCOS QUE APLICAS:
- AIDA: Atención → Interés → Deseo → Acción
- StoryBrand (Donald Miller): el cliente es el héroe, el producto es la guía
- PAS: Problema → Agitación → Solución
- Before-After-Bridge: situación actual → situación futura → el puente (el producto)

PRINCIPIOS CIALDINI que aplicas en cada página:
1. Reciprocidad: dar valor antes de pedir
2. Autoridad: credenciales, resultados, datos
3. Prueba social: testimonios implícitos, resultados de clientes
4. Escasez: razón lógica de por qué actuar ahora
5. Compromiso: micro-sí progresivos
6. Simpatía: tono conversacional, empatía real

ESTRUCTURA DE LA PÁGINA DE VENTAS:
1. HEADLINE (gancho de atención brutal - el dolor o la promesa)
2. SUBHEADLINE (clarifica y amplía)
3. HISTORIA DE IDENTIFICACIÓN (el cliente se ve reflejado)
4. EL PROBLEMA AGITADO (antes de dar la solución)
5. LA SOLUCIÓN PRESENTADA (el producto como héroe)
6. LO QUE VAS A LOGRAR (bullets de beneficios, no features)
7. QUÉ INCLUYE (la estructura del producto)
8. PRECIO Y OFERTA (con anclaje)
9. GARANTÍA (reducción de riesgo)
10. CIERRE Y CTA (urgencia + beneficio)

PARA LOS 3 GANCHOS DE REDES:
- Gancho 1: PAS (Problema-Agitación-Solución) - formato de hilo/carrusel
- Gancho 2: Before-After-Bridge - formato de historia personal
- Gancho 3: Dato sorprendente o contraintuitivo - formato de opinión controversial

Devuelve SOLO JSON:
{
  "pagina_ventas": "La página de ventas completa en Markdown, con todos los secciones marcadas con ##",
  "ganchos_redes": [
    "Gancho 1 completo (PAS) - listo para publicar",
    "Gancho 2 completo (BAB) - listo para publicar",
    "Gancho 3 completo (dato/hook) - listo para publicar"
  ],
  "email_lanzamiento": "Email de lanzamiento completo con asunto y cuerpo"
}`

export async function runVendedor(
  investigador: InvestigadorOutput,
  estratega: EstrategaOutput,
  creador: CreadorOutput
): Promise<VendedorOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const modulosList = creador.modulos
    .map(m => `- ${m.titulo}: ${m.transformacion}`)
    .join('\n')

  const bonusList = creador.bonus
    .map(b => `- ${b.titulo} (valor ${b.valor_percibido})`)
    .join('\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.8,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `PRODUCTO: ${estratega.nombre_producto}
SUBTÍTULO: ${estratega.subtitulo}
TIPO: ${creador.tipo_estructura}

AVATAR (${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}):
- Dolor: ${estratega.avatar.cita_directa}
- Objeciones: ${estratega.avatar.objeciones.join(', ')}

TRANSFORMACIÓN:
ANTES: ${estratega.promesa_before}
DESPUÉS: ${estratega.promesa_after}
RESULTADO VISIBLE: ${estratega.transformacion_visible}

ESTRUCTURA (${creador.duracion_estimada}):
${modulosList}

BONUS:
${bonusList}

PRECIO:
~~$${estratega.precio_anchor}~~ → $${estratega.precio_principal} | Downsell: $${estratega.precio_downsell}

PAIN POINTS:
- Principal: ${investigador.dolor_principal}
- Secundarios: ${investigador.dolores_secundarios.join(', ')}

PLATAFORMAS DEL AVATAR: ${investigador.audiencia.plataformas.join(', ')}

Escribe el copy completo. Devuelve SOLO el JSON, sin markdown exterior.`,
      },
    ],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as VendedorOutput
}
