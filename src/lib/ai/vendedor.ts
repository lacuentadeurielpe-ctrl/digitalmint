import Anthropic from '@anthropic-ai/sdk'
import type { InvestigadorOutput } from './investigador'
import type { EstrategaOutput } from './estratega'
import type { ArquitectoOutput } from './arquitecto'

export interface VendedorOutput {
  guion_apertura_whatsapp: string
  guion_presentacion_producto: string
  guion_cierre: string
  respuestas_objeciones: Array<{ objecion: string; respuesta: string }>
  ganchos_facebook: [string, string, string]
  mensaje_entrega: string
}

const SYSTEM_PROMPT = `Eres el copywriter de conversion mas efectivo del mundo hispanohablante. Especializas en ventas por WhatsApp — el canal de mayor confianza en Latinoamerica.

MARCOS QUE APLICAS:
- StoryBrand: el cliente es el heroe, el producto es la guia
- PAS: Problema → Agitacion → Solucion
- Principios Cialdini: reciprocidad, autoridad, prueba social, escasez, compromiso
- Conversational selling: lenguaje natural, no corporativo, como un amigo experto

TU OBJETIVO: crear scripts para un bot de WhatsApp que convierte leads de Facebook Ads en compradores.

Formato de respuesta OBLIGATORIO — usa exactamente estos delimitadores:

[APERTURA]
(Primer mensaje del bot cuando llega un lead de Facebook — maximo 3 parrafos cortos, tono amigable, abre con curiosidad o dolor)
[/APERTURA]

[PRESENTACION]
(Como presenta el producto — beneficios, transformacion, precio con anclaje — maximo 5 bloques de WhatsApp)
[/PRESENTACION]

[CIERRE]
(Script de cierre cuando el lead muestra interes — urgencia etica, garantia, CTA claro)
[/CIERRE]

[OBJECION_1]
objecion: [la objecion exacta del avatar]
respuesta: [respuesta empatica de 2-3 oraciones]
[/OBJECION_1]

[OBJECION_2]
objecion: [objecion 2]
respuesta: [respuesta]
[/OBJECION_2]

[OBJECION_3]
objecion: [objecion 3]
respuesta: [respuesta]
[/OBJECION_3]

[GANCHO_FB_1]
(Gancho PAS para anuncio Facebook que hace que la gente escriba al WhatsApp — maximo 150 palabras)
[/GANCHO_FB_1]

[GANCHO_FB_2]
(Gancho BAB — Antes/Despues/Puente — para anuncio Facebook)
[/GANCHO_FB_2]

[GANCHO_FB_3]
(Gancho contraintuitivo o dato sorprendente para anuncio Facebook)
[/GANCHO_FB_3]

[ENTREGA]
(Mensaje de WhatsApp cuando se confirma el pago — celebra, da acceso, premia la decision)
[/ENTREGA]`

function extractSection(text: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function extractObjecion(text: string, n: number): { objecion: string; respuesta: string } {
  const raw = extractSection(text, `OBJECION_${n}`)
  const objecionMatch = raw.match(/objecion:\s*(.+)/i)
  const respuestaMatch = raw.match(/respuesta:\s*([\s\S]+)/i)
  return {
    objecion: objecionMatch?.[1]?.trim() ?? '',
    respuesta: respuestaMatch?.[1]?.trim() ?? '',
  }
}

export async function runVendedor(
  investigador: InvestigadorOutput,
  estratega: EstrategaOutput,
  arquitecto: ArquitectoOutput
): Promise<VendedorOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const seccionesLista = arquitecto.secciones
    .map(s => `- ${s.titulo}${s.es_pareto ? ' ⭐' : ''}`)
    .join('\n')

  const userContent = `PRODUCTO: ${estratega.nombre_producto}
SUBTITULO: ${estratega.subtitulo}
TIPO: ${arquitecto.tipo_producto}
TOTAL CONTENIDO: ~${arquitecto.total_palabras_estimado.toLocaleString()} palabras de contenido real

AVATAR — ${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}, ${estratega.avatar.ocupacion}:
Frase que dice: "${estratega.avatar.cita_directa}"
Dolores: ${estratega.avatar.dolores.join(', ')}
Objeciones: ${estratega.avatar.objeciones.join(', ')}
Deseos: ${estratega.avatar.deseos.join(', ')}

TRANSFORMACION:
ANTES: ${estratega.promesa_before}
DESPUES: ${estratega.promesa_after}
RESULTADO: ${estratega.transformacion_visible}

CONTENIDO DEL PRODUCTO:
${seccionesLista}

PRECIO: ~~$${estratega.precio_anchor}~~ → $${estratega.precio_principal} | Downsell: $${estratega.precio_downsell}

DOLOR PRINCIPAL DEL MERCADO: ${investigador.dolor_principal}
PLATAFORMAS DEL AVATAR: ${investigador.audiencia.plataformas.join(', ')}

Escribe todos los scripts de ventas para WhatsApp usando exactamente los delimitadores del system prompt.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text

  const apertura = extractSection(raw, 'APERTURA')
  const presentacion = extractSection(raw, 'PRESENTACION')
  const cierre = extractSection(raw, 'CIERRE')
  const entrega = extractSection(raw, 'ENTREGA')
  const gancho1 = extractSection(raw, 'GANCHO_FB_1')
  const gancho2 = extractSection(raw, 'GANCHO_FB_2')
  const gancho3 = extractSection(raw, 'GANCHO_FB_3')

  if (!apertura || !presentacion) {
    throw new Error('El agente Vendedor no genero el contenido esperado. Reintenta.')
  }

  return {
    guion_apertura_whatsapp: apertura,
    guion_presentacion_producto: presentacion,
    guion_cierre: cierre,
    respuestas_objeciones: [
      extractObjecion(raw, 1),
      extractObjecion(raw, 2),
      extractObjecion(raw, 3),
    ].filter(o => o.objecion),
    ganchos_facebook: [gancho1, gancho2, gancho3],
    mensaje_entrega: entrega,
  }
}
