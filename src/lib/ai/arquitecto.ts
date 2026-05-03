import { deepseekJSON, deepseekText } from './deepseek'
import type { InvestigadorOutput } from './investigador'
import type { EstrategaOutput } from './estratega'

export interface SeccionBrief {
  orden: number
  tipo_seccion: 'intro' | 'capitulo' | 'modulo' | 'leccion' | 'seccion' | 'plantilla' | 'bonus' | 'conclusion'
  titulo: string
  brief: string
  palabras_objetivo: number
  puntos_clave: string[]
  es_pareto: boolean
}

export interface ArquitectoOutput {
  tipo_producto: string
  estructura_descripcion: string
  secciones: SeccionBrief[]
  bible: string
  total_palabras_estimado: number
}

// ── STEP 1: Bible como texto libre (sin JSON — nunca falla por escaping) ──
const BIBLE_SYSTEM = `Eres el arquitecto jefe de productos digitales. Tu tarea es escribir la BIBLIA de un producto digital.

La Biblia es un documento de contexto compartido de 1500-2000 palabras que todos los escritores del equipo leeran para mantener coherencia. Escribe en espanol claro. No uses comillas dobles dentro del texto.

La Biblia debe contener:
1. IDENTIDAD DEL PRODUCTO — nombre, proposito central, que lo hace unico
2. LA GRAN PROMESA — transformacion antes/despues, resultado concreto
3. PERFIL DEL AVATAR — quien es, que siente, que quiere, que le preocupa
4. EL SISTEMA/METODO — el marco metodologico propio del producto (dale un nombre unico)
5. VOCABULARIO CLAVE — 8-12 terminos que se usaran consistentemente en todo el producto
6. TONO Y ESTILO — como hablar al lector (formal/informal, tu/usted, nivel tecnico)
7. LAS 5 VERDADES FUNDAMENTALES — los principios que el producto defiende
8. EL CAMINO DEL LECTOR — como progresa desde el inicio hasta la transformacion

Devuelve SOLO el texto de la Biblia, sin titulos extra, sin markdown de encabezados, solo el contenido.`

// ── STEP 2: Briefs de secciones como JSON limpio (sin Bible adentro) ──
const BRIEFS_SYSTEM = `Eres el arquitecto jefe de productos digitales. Disenias la estructura perfecta del producto.

TIPOS DE PRODUCTO y su estructura tipica:
- ebook: 8-10 capitulos de 1500-2500 palabras c/u
- curso online: 5-7 modulos con 2-3 lecciones de 1500-2000 palabras c/u
- guia practica: 6-8 secciones de 1200-2000 palabras c/u
- template pack: 4-6 plantillas con guias de 800-1500 palabras c/u
- workshop: 4-5 sesiones de 2000-2500 palabras c/u

REGLAS CRITICAS para el JSON:
- Los valores de "brief" y "titulo" NO pueden contener comillas dobles (usa comillas simples o reformula)
- Los "puntos_clave" son frases cortas de maximo 10 palabras cada una
- El brief de cada seccion es de 100-150 palabras maximo
- Devuelve SOLO el JSON, sin texto adicional, sin markdown

Devuelve exactamente este schema:
{
  "tipo_producto": "string",
  "estructura_descripcion": "string de maximo 2 oraciones",
  "total_palabras_estimado": 20000,
  "secciones": [
    {
      "orden": 1,
      "tipo_seccion": "capitulo",
      "titulo": "Titulo sin comillas dobles",
      "brief": "Descripcion de 100-150 palabras de que cubre esta seccion. Sin comillas dobles.",
      "palabras_objetivo": 2000,
      "puntos_clave": ["punto uno", "punto dos", "punto tres"],
      "es_pareto": false
    }
  ]
}`

export async function runArquitecto(
  idea: string,
  investigador: InvestigadorOutput,
  estratega: EstrategaOutput
): Promise<ArquitectoOutput> {
  const contexto = `IDEA: "${idea}"
PRODUCTO: ${estratega.nombre_producto} — ${estratega.subtitulo}
TIPO: ${estratega.tipo_producto}
PROMESA: ${estratega.promesa_before} -> ${estratega.promesa_after}
RESULTADO: ${estratega.transformacion_visible}
AVATAR: ${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}, ${estratega.avatar.ocupacion}
DOLORES: ${estratega.avatar.dolores.join(', ')}
OBJECIONES: ${estratega.avatar.objeciones.join(', ')}
JTBD: ${investigador.jtbd}
DIFERENCIADORES: ${investigador.diferenciadores_posibles.join(', ')}`

  // Dos llamadas separadas — Bible como texto puro, briefs como JSON simple
  const [bible, briefs] = await Promise.all([
    deepseekText(
      BIBLE_SYSTEM,
      `${contexto}\n\nEscribe la Biblia completa del producto (1500-2000 palabras):`,
      3000
    ),
    deepseekJSON<Omit<ArquitectoOutput, 'bible'>>(
      BRIEFS_SYSTEM,
      `${contexto}\n\nDiseña la estructura completa con briefs por seccion. Devuelve SOLO el JSON:`,
      4000
    ),
  ])

  // Validate secciones — if empty or malformed, create a basic fallback
  const secciones = Array.isArray(briefs.secciones) && briefs.secciones.length > 0
    ? briefs.secciones
    : generateFallbackSecciones(estratega.tipo_producto)

  return {
    tipo_producto: briefs.tipo_producto || estratega.tipo_producto,
    estructura_descripcion: briefs.estructura_descripcion || 'Producto digital estructurado en modulos progresivos.',
    total_palabras_estimado: briefs.total_palabras_estimado || 18000,
    secciones,
    bible: bible || `Producto: ${estratega.nombre_producto}. Promesa: ${estratega.promesa_after}`,
  }
}

function generateFallbackSecciones(tipoProd: string): SeccionBrief[] {
  const base = tipoProd?.toLowerCase().includes('ebook') ? 'capitulo' : 'modulo'
  return [
    { orden: 1, tipo_seccion: base as SeccionBrief['tipo_seccion'], titulo: 'Fundamentos esenciales', brief: 'Introduce los conceptos base que el lector necesita para aprovechar el producto al maximo. Contextualiza el problema y presenta el marco metodologico.', palabras_objetivo: 2000, puntos_clave: ['contexto del problema', 'por que importa', 'el marco del producto'], es_pareto: false },
    { orden: 2, tipo_seccion: base as SeccionBrief['tipo_seccion'], titulo: 'El metodo central', brief: 'Desarrolla el sistema principal del producto. Este es el nucleo de la transformacion prometida.', palabras_objetivo: 2500, puntos_clave: ['el sistema paso a paso', 'aplicacion practica', 'errores comunes'], es_pareto: true },
    { orden: 3, tipo_seccion: base as SeccionBrief['tipo_seccion'], titulo: 'Implementacion y resultados', brief: 'Guia al lector en la aplicacion concreta del metodo. Ejercicios, plantillas y casos reales.', palabras_objetivo: 2000, puntos_clave: ['plan de accion', 'metricas de exito', 'siguiente nivel'], es_pareto: false },
    { orden: 4, tipo_seccion: 'bonus' as SeccionBrief['tipo_seccion'], titulo: 'Bonus: Recursos y herramientas', brief: 'Recursos adicionales de alto valor percibido que complementan el contenido principal.', palabras_objetivo: 1000, puntos_clave: ['herramientas recomendadas', 'plantillas listas', 'proximos pasos'], es_pareto: false },
  ]
}
