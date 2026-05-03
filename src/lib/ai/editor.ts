import { deepseekText } from './deepseek'
import type { SeccionBrief } from './arquitecto'

export interface SeccionEditor {
  tipo_seccion: 'intro' | 'conclusion' | 'toc'
  titulo: string
  contenido: string
  palabras_count: number
  orden: number
}

const INTRO_SYSTEM = `Eres el editor jefe de un producto digital. Escribes la introduccion que engancha al lector desde la primera pagina.

La introduccion perfecta:
1. HISTORIA DE IDENTIFICACION — el lector se ve reflejado en 3-5 oraciones
2. EL PROBLEMA — agitas el dolor sin dar la solucion aun
3. LA PROMESA — que lograran al terminar este producto (resultado concreto)
4. QUIEN SOY YO — autoridad del autor (puedes inventar un autor creible)
5. COMO USAR ESTE PRODUCTO — guia rapida de como sacarle maximo provecho
6. EL CAMINO — preview de lo que viene seccion por seccion

Escribe en espanol, en segunda persona (tu), tono cercano pero profesional. 800-1200 palabras.
Devuelve SOLO el contenido markdown sin comentarios.`

const CONCLUSION_SYSTEM = `Eres el editor jefe de un producto digital. Escribes la conclusion que sella la transformacion y da el siguiente paso.

La conclusion perfecta:
1. CELEBRACION — reconoce el viaje del lector
2. SINTESIS — las 3-5 insights mas importantes del producto
3. EL SIGUIENTE PASO — que hacer ahora mismo (accion concreta)
4. VISION FUTURA — como sera su vida aplicando esto
5. MENSAJE FINAL — cierre emocional memorable

Escribe en espanol, segunda persona (tu), tono inspirador pero concreto. 600-900 palabras.
Devuelve SOLO el contenido markdown sin comentarios.`

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function buildContext(
  bible: string,
  secciones: SeccionBrief[],
  nombreProducto: string,
  subtitulo: string
): string {
  const seccionesLista = secciones
    .map(s => `${s.orden}. ${s.titulo} (${s.tipo_seccion})`)
    .join('\n')
  return `PRODUCTO: ${nombreProducto}
SUBTITULO: ${subtitulo}

BIBLIA (contexto):
${bible.slice(0, 1500)}

ESTRUCTURA COMPLETA DEL PRODUCTO:
${seccionesLista}`
}

export function buildToc(secciones: SeccionBrief[]): SeccionEditor {
  const tocLineas = secciones.map(s => `- ${s.titulo}`).join('\n')
  const tocContenido = `## Tabla de Contenidos\n\n${tocLineas}`
  return {
    tipo_seccion: 'toc',
    titulo: 'Tabla de Contenidos',
    contenido: tocContenido,
    palabras_count: countWords(tocContenido),
    orden: 0,
  }
}

export async function runIntro(
  bible: string,
  secciones: SeccionBrief[],
  nombreProducto: string,
  subtitulo: string
): Promise<SeccionEditor> {
  const contexto = buildContext(bible, secciones, nombreProducto, subtitulo)
  const contenido = await deepseekText(
    INTRO_SYSTEM,
    `${contexto}\n\nEscribe la INTRODUCCION completa del producto (800-1200 palabras):`,
    2500
  )
  return {
    tipo_seccion: 'intro',
    titulo: 'Introduccion',
    contenido: contenido || `# Bienvenido a ${nombreProducto}\n\n${subtitulo}`,
    palabras_count: countWords(contenido),
    orden: -1,
  }
}

export async function runConclusion(
  bible: string,
  secciones: SeccionBrief[],
  nombreProducto: string,
  subtitulo: string
): Promise<SeccionEditor> {
  const contexto = buildContext(bible, secciones, nombreProducto, subtitulo)
  const contenido = await deepseekText(
    CONCLUSION_SYSTEM,
    `${contexto}\n\nEscribe la CONCLUSION completa del producto (600-900 palabras):`,
    2000
  )
  return {
    tipo_seccion: 'conclusion',
    titulo: 'Conclusion: Tu Transformacion Continua',
    contenido: contenido || `## Conclusion\n\nHas completado ${nombreProducto}. Ahora aplica lo aprendido para lograr ${subtitulo}.`,
    palabras_count: countWords(contenido),
    orden: 9999,
  }
}
