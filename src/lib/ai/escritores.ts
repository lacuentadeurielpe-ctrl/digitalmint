import { deepseekText } from './deepseek'
import type { SeccionBrief } from './arquitecto'

export interface SeccionEscrita {
  orden: number
  tipo_seccion: string
  titulo: string
  contenido: string
  palabras_count: number
}

const WRITER_SYSTEM = `Eres un escritor experto en productos digitales hispanohablantes. Escribes contenido de alta calidad que transforma, educa y conecta emocionalmente con el lector.

REGLAS:
- Sigue exactamente el brief y los puntos clave asignados
- Usa el vocabulario y tono definidos en la Biblia del producto
- Escribe en segunda persona (tu) o primera persona plural segun el tono indicado
- Incluye ejemplos concretos, analogias y ejercicios practicos
- Usa subtitulos con ## para organizar el contenido
- El contenido debe ser COMPLETO y profundo, no un resumen
- Escribe en espanol neutro hispanohablante
- No uses comillas dobles dentro del texto

FORMATO:
Devuelve SOLO el contenido en markdown. No incluyas el titulo principal (ya existe), ni comentarios meta, ni frases como "En esta seccion vamos a..."`

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function writeSeccionWithRetry(
  bible: string,
  seccion: SeccionBrief,
  nombreProducto: string,
  subtitulo: string,
  attempt = 0
): Promise<SeccionEscrita> {
  // Truncate bible to keep within token budget (first 1500 words ~2000 tokens)
  const biblePreview = bible.split(/\s+/).slice(0, 1500).join(' ')

  const userContent = `BIBLIA DEL PRODUCTO (lee con atencion para mantener coherencia):
---
${biblePreview}
---

PRODUCTO: ${nombreProducto} — ${subtitulo}

TU SECCION ASIGNADA: ${seccion.titulo}
TIPO: ${seccion.tipo_seccion}
OBJETIVO: ${seccion.palabras_objetivo} palabras minimo
${seccion.es_pareto ? 'ATENCION: Esta es la seccion mas importante del producto. Maximo detalle y profundidad.' : ''}

QUE DEBE CONTENER (brief):
${seccion.brief}

PUNTOS CLAVE OBLIGATORIOS:
${seccion.puntos_clave.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Escribe el contenido completo. Desarrolla cada punto con profundidad, ejemplos reales y ejercicios practicos. Minimo ${seccion.palabras_objetivo} palabras.`

  const contenido = await deepseekText(WRITER_SYSTEM, userContent, 3000)

  // If content is too short (LLM truncated), retry once with a shorter target
  if (countWords(contenido) < 500 && attempt === 0) {
    return writeSeccionWithRetry(bible, seccion, nombreProducto, subtitulo, 1)
  }

  return {
    orden: seccion.orden,
    tipo_seccion: seccion.tipo_seccion,
    titulo: seccion.titulo,
    contenido: contenido || `## ${seccion.titulo}\n\n${seccion.brief}\n\n${seccion.puntos_clave.join('\n\n')}`,
    palabras_count: countWords(contenido),
  }
}

export async function runEscritores(
  bible: string,
  secciones: SeccionBrief[],
  nombreProducto: string,
  subtitulo: string
): Promise<SeccionEscrita[]> {
  if (!secciones || secciones.length === 0) {
    throw new Error('El Arquitecto no generó secciones válidas')
  }

  // Run all writers in parallel — use allSettled so one failure doesn't kill all
  const results = await Promise.allSettled(
    secciones.map(sec =>
      writeSeccionWithRetry(bible, sec, nombreProducto, subtitulo)
    )
  )

  const written: SeccionEscrita[] = []
  const failed: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      written.push(result.value)
    } else {
      failed.push(result.reason?.message ?? 'Error desconocido')
    }
  }

  // If more than half failed, throw to trigger a full retry
  if (written.length < secciones.length / 2) {
    throw new Error(`Demasiadas secciones fallaron (${failed.length}/${secciones.length}). Errores: ${failed.slice(0, 2).join(', ')}`)
  }

  // For individual failures — create a placeholder so product is still usable
  const allSections = [...written]
  for (const sec of secciones) {
    if (!written.find(w => w.orden === sec.orden)) {
      allSections.push({
        orden: sec.orden,
        tipo_seccion: sec.tipo_seccion,
        titulo: sec.titulo,
        contenido: `## ${sec.titulo}\n\n${sec.brief}\n\n**Puntos clave:**\n${sec.puntos_clave.map(p => `- ${p}`).join('\n')}`,
        palabras_count: countWords(sec.brief),
      })
    }
  }

  return allSections.sort((a, b) => a.orden - b.orden)
}
