import { deepseekText } from './deepseek'
import type { SeccionBrief } from './arquitecto'

export interface SeccionEscrita {
  orden: number
  tipo_seccion: string
  titulo: string
  contenido: string
  palabras_count: number
}

const WRITER_SYSTEM = `Eres un escritor experto en productos digitales hispanohablantes. Escribes contenido de alta calidad que transforma, educa y conecta emocionalmente.

REGLAS DE ESCRITURA:
- Escribe en segunda persona (tu/usted) o primera persona plural (nosotros)
- Sigue EXACTAMENTE el brief y los puntos clave asignados
- Mantiene el tono y vocabulario de la Biblia del producto
- Usa analogias, ejemplos concretos y ejercicios practicos cuando aplica
- Estructura con headers markdown (## para subsecciones, ### para sub-subsecciones)
- Incluye al menos 1 ejercicio o accion practica por seccion cuando corresponda
- Usa listas, bullets y tablas para romper el texto y facilitar la lectura
- El contenido debe ser COMPLETO, no un resumen — desarrolla cada punto con profundidad
- Escribe en espanol hispanohablante neutro

FORMATO DE SALIDA:
Devuelve SOLO el contenido en markdown, comenzando con ## [titulo de subseccion]. No incluyas el titulo principal de la seccion (ya existe), ni meta-comentarios, ni frases de introduccion como "En esta seccion..."`

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function writeSeccion(
  bible: string,
  seccion: SeccionBrief,
  nombreProducto: string,
  subtitulo: string
): Promise<SeccionEscrita> {
  const userContent = `BIBLIA DEL PRODUCTO (contexto compartido — lee con atencion):
${bible}

---

PRODUCTO: ${nombreProducto}
SUBTITULO: ${subtitulo}

TU ASIGNACION:
Seccion: ${seccion.titulo}
Tipo: ${seccion.tipo_seccion}
Objetivo: ${seccion.palabras_objetivo} palabras
${seccion.es_pareto ? '⭐ ESTA ES LA SECCION PARETO — el nucleo del producto, maximo esfuerzo y detalle' : ''}

BRIEF (que debes escribir):
${seccion.brief}

PUNTOS CLAVE A CUBRIR (obligatorios):
${seccion.puntos_clave.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Escribe la seccion completa con al menos ${seccion.palabras_objetivo} palabras. Desarrolla cada punto con profundidad, ejemplos y ejercicios practicos.`

  const contenido = await deepseekText(WRITER_SYSTEM, userContent, 5000)

  return {
    orden: seccion.orden,
    tipo_seccion: seccion.tipo_seccion,
    titulo: seccion.titulo,
    contenido,
    palabras_count: countWords(contenido),
  }
}

export async function runEscritores(
  bible: string,
  secciones: SeccionBrief[],
  nombreProducto: string,
  subtitulo: string
): Promise<SeccionEscrita[]> {
  // Run all section writers in parallel
  const promises = secciones.map(sec =>
    writeSeccion(bible, sec, nombreProducto, subtitulo)
  )
  const results = await Promise.all(promises)
  return results.sort((a, b) => a.orden - b.orden)
}
