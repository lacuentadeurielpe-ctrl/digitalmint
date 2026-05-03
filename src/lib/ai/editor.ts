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

Escribe en espanol, en segunda persona (tu), tono cercano pero profesional. Minimo 1200 palabras.
Devuelve SOLO el contenido markdown sin comentarios.`

const CONCLUSION_SYSTEM = `Eres el editor jefe de un producto digital. Escribes la conclusion que sella la transformacion y da el siguiente paso.

La conclusion perfecta:
1. CELEBRACION — reconoce el viaje del lector
2. SINTESIS — las 3-5 insights mas importantes del producto
3. EL SIGUIENTE PASO — que hacer ahora mismo (accion concreta)
4. VISION FUTURA — como sera su vida aplicando esto
5. MENSAJE FINAL — cierre emocional memorable

Escribe en espanol, segunda persona (tu), tono inspirador pero concreto. Minimo 800 palabras.
Devuelve SOLO el contenido markdown sin comentarios.`

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function runEditor(
  bible: string,
  secciones: SeccionBrief[],
  nombreProducto: string,
  subtitulo: string
): Promise<SeccionEditor[]> {
  const seccionesLista = secciones
    .map(s => `${s.orden}. ${s.titulo} (${s.tipo_seccion})`)
    .join('\n')

  const contexto = `PRODUCTO: ${nombreProducto}
SUBTITULO: ${subtitulo}

BIBLIA (contexto):
${bible.slice(0, 2000)}

ESTRUCTURA COMPLETA DEL PRODUCTO:
${seccionesLista}`

  const [introContenido, conclusionContenido] = await Promise.all([
    deepseekText(
      INTRO_SYSTEM,
      `${contexto}\n\nEscribe la INTRODUCCION completa del producto (minimo 1200 palabras):`,
      3000
    ),
    deepseekText(
      CONCLUSION_SYSTEM,
      `${contexto}\n\nEscribe la CONCLUSION completa del producto (minimo 800 palabras):`,
      2500
    ),
  ])

  // TOC — simple computed from secciones
  const tocLineas = secciones.map(s => `- ${s.titulo}`).join('\n')
  const tocContenido = `## Tabla de Contenidos\n\n${tocLineas}`

  return [
    {
      tipo_seccion: 'toc',
      titulo: 'Tabla de Contenidos',
      contenido: tocContenido,
      palabras_count: countWords(tocContenido),
      orden: 0,
    },
    {
      tipo_seccion: 'intro',
      titulo: 'Introduccion',
      contenido: introContenido,
      palabras_count: countWords(introContenido),
      orden: -1, // Will be placed before all sections
    },
    {
      tipo_seccion: 'conclusion',
      titulo: 'Conclusion: Tu Transformacion Continua',
      contenido: conclusionContenido,
      palabras_count: countWords(conclusionContenido),
      orden: 9999,
    },
  ]
}
