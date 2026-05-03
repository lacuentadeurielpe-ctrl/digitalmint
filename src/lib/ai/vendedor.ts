import { deepseekText } from './deepseek'
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

const SYSTEM_PROMPT = `Eres el copywriter de conversion mas efectivo del mundo hispanohablante. Especializas en ventas por WhatsApp.

MARCOS QUE APLICAS:
- StoryBrand: el cliente es el heroe, el producto es la guia
- PAS: Problema Agitacion Solucion
- Principios Cialdini: reciprocidad, autoridad, prueba social, escasez
- Conversational selling: lenguaje natural, como un amigo experto

Devuelve UNICAMENTE el formato de etiquetas indicado, sin texto adicional.`

function extract(raw: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
  const match = raw.match(regex)
  return match ? match[1].trim() : ''
}

function extractObjecion(raw: string, n: number): { objecion: string; respuesta: string } {
  const block = extract(raw, `OBJECION_${n}`)
  const objecionMatch = block.match(/objecion:\s*(.+)/i)
  const respuestaMatch = block.match(/respuesta:\s*([\s\S]+)/i)
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
  const seccionesLista = arquitecto.secciones
    .map(s => `- ${s.titulo}${s.es_pareto ? ' (seccion principal)' : ''}`)
    .join('\n')

  const userContent = `PRODUCTO: ${estratega.nombre_producto}
SUBTITULO: ${estratega.subtitulo}
TIPO: ${arquitecto.tipo_producto}
CONTENIDO: ${arquitecto.total_palabras_estimado.toLocaleString()} palabras reales

AVATAR — ${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}, ${estratega.avatar.ocupacion}:
Frase: "${estratega.avatar.cita_directa}"
Dolores: ${estratega.avatar.dolores.join(', ')}
Objeciones: ${estratega.avatar.objeciones.join(', ')}
Deseos: ${estratega.avatar.deseos.join(', ')}

TRANSFORMACION:
ANTES: ${estratega.promesa_before}
DESPUES: ${estratega.promesa_after}

SECCIONES:
${seccionesLista}

PRECIO: $${estratega.precio_anchor} anclaje -> $${estratega.precio_principal} | Downsell: $${estratega.precio_downsell}

Escribe EXACTAMENTE en este formato (sin texto extra):

[APERTURA]
Primer mensaje del bot cuando llega un lead de Facebook. Maximo 3 parrafos cortos. Abre con el dolor o curiosidad. Tono amigable, como un amigo experto.
[/APERTURA]

[PRESENTACION]
Como presenta el producto. Beneficios, transformacion, precio con anclaje. Maximo 5 bloques de WhatsApp. Usa lineas cortas para que se vea bien en movil.
[/PRESENTACION]

[CIERRE]
Script de cierre cuando el lead muestra interes. Urgencia etica, garantia, CTA claro. 2-3 parrafos.
[/CIERRE]

[OBJECION_1]
objecion: ${estratega.avatar.objeciones[0] ?? 'No tengo tiempo'}
respuesta: respuesta empatica de 2-3 oraciones que disuelve esa objecion
[/OBJECION_1]

[OBJECION_2]
objecion: ${estratega.avatar.objeciones[1] ?? 'Es muy caro'}
respuesta: respuesta empatica de 2-3 oraciones
[/OBJECION_2]

[OBJECION_3]
objecion: ${estratega.avatar.objeciones[2] ?? 'No se si funciona para mi'}
respuesta: respuesta empatica de 2-3 oraciones
[/OBJECION_3]

[GANCHO_FB_1]
Gancho PAS (Problema Agitacion Solucion) para anuncio Facebook. Maximo 120 palabras. Hace que la gente escriba al WhatsApp.
[/GANCHO_FB_1]

[GANCHO_FB_2]
Gancho BAB (Antes Despues Puente) para anuncio Facebook. Maximo 120 palabras.
[/GANCHO_FB_2]

[GANCHO_FB_3]
Gancho contraintuitivo o dato sorprendente para anuncio Facebook. Maximo 120 palabras.
[/GANCHO_FB_3]

[ENTREGA]
Mensaje de WhatsApp cuando se confirma el pago. Celebra, da acceso, premia la decision. 2 parrafos.
[/ENTREGA]`

  const raw = await deepseekText(SYSTEM_PROMPT, userContent, 3000)

  const apertura = extract(raw, 'APERTURA') || `Hola! Vi que te interesa ${estratega.nombre_producto}. Cuéntame, ¿cuál es tu mayor reto ahora mismo con ${investigador.dolor_principal}?`
  const presentacion = extract(raw, 'PRESENTACION') || `${estratega.nombre_producto}: ${estratega.subtitulo}\n\nTransformación: ${estratega.promesa_after}\n\nPrecio especial: $${estratega.precio_principal}`
  const cierre = extract(raw, 'CIERRE') || `Esta oferta es por tiempo limitado. ¿Te gustaría empezar hoy?`
  const entrega = extract(raw, 'ENTREGA') || `¡Felicidades! Tu acceso está listo. Aquí tienes el enlace de descarga.`
  const gancho1 = extract(raw, 'GANCHO_FB_1') || `¿Sigues luchando con ${investigador.dolor_principal}? Descubre cómo ${estratega.promesa_after}. Escríbenos al WhatsApp.`
  const gancho2 = extract(raw, 'GANCHO_FB_2') || `Antes: ${estratega.promesa_before}. Después: ${estratega.promesa_after}. El puente: ${estratega.nombre_producto}.`
  const gancho3 = extract(raw, 'GANCHO_FB_3') || `El 90% de personas con ${investigador.dolor_principal} lo hacen al revés. Te mostramos cómo hacerlo bien.`

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
