import { deepseekText } from './deepseek'
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

function extract(raw: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
  const match = raw.match(regex)
  return match ? match[1].trim() : ''
}

function extractInt(raw: string, tag: string, fallback: number): number {
  const val = extract(raw, tag)
  const n = parseInt(val.replace(/\D/g, ''), 10)
  return isNaN(n) ? fallback : n
}

function parseSecciones(raw: string): SeccionBrief[] {
  const seccionRegex = /\[SECCION\]([\s\S]*?)\[\/SECCION\]/gi
  const secciones: SeccionBrief[] = []
  let match: RegExpExecArray | null

  while ((match = seccionRegex.exec(raw)) !== null) {
    const block = match[1]

    const getField = (key: string): string => {
      const m = block.match(new RegExp(`^${key}=(.+)$`, 'm'))
      return m ? m[1].trim() : ''
    }

    const orden = parseInt(getField('orden') || '0', 10)
    const titulo = getField('titulo')
    if (!titulo || orden === 0) continue

    const tipoRaw = getField('tipo').toLowerCase() as SeccionBrief['tipo_seccion']
    const tiposValidos: SeccionBrief['tipo_seccion'][] = ['intro', 'capitulo', 'modulo', 'leccion', 'seccion', 'plantilla', 'bonus', 'conclusion']
    const tipo_seccion = tiposValidos.includes(tipoRaw) ? tipoRaw : 'capitulo'

    const puntosRaw = getField('puntos')
    const puntos_clave = puntosRaw ? puntosRaw.split('|').map(p => p.trim()).filter(Boolean) : []

    const palabras = parseInt(getField('palabras') || '2000', 10)
    const esPareto = getField('pareto').toLowerCase() === 'true'
    const brief = getField('brief')

    secciones.push({
      orden,
      tipo_seccion,
      titulo,
      brief: brief || `Contenido completo para ${titulo}`,
      palabras_objetivo: isNaN(palabras) ? 2000 : palabras,
      puntos_clave: puntos_clave.length ? puntos_clave : ['desarrollo del tema', 'ejemplos practicos', 'ejercicios de aplicacion'],
      es_pareto: esPareto,
    })
  }

  return secciones.sort((a, b) => a.orden - b.orden)
}

const SYSTEM_PROMPT = `Eres el arquitecto jefe de productos digitales hispanohablantes. Diseñas la estructura y escribes la Biblia del producto.

Devuelve UNICAMENTE el formato de etiquetas indicado, sin ningun texto adicional, sin explicaciones, sin markdown, sin JSON.

TIPOS DE PRODUCTO y su estructura tipica:
- ebook: 8-10 capitulos de 1500-2500 palabras c/u
- curso online: 5-7 modulos con 2-3 lecciones de 1500-2000 palabras c/u
- guia practica: 6-8 secciones de 1200-2000 palabras c/u
- template pack: 4-6 plantillas con guias de 800-1500 palabras c/u
- workshop: 4-5 sesiones de 2000-2500 palabras c/u

La BIBLIA es un documento de 1500-2000 palabras que todos los escritores leeran. Debe contener:
identidad del producto, la gran promesa, perfil del avatar, el metodo propio (con nombre unico), vocabulario clave, tono y estilo, 5 verdades fundamentales, camino del lector.`

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

  const userContent = `${contexto}

Devuelve EXACTAMENTE en este formato (sin texto extra, solo etiquetas):

[TIPO_PRODUCTO]${estratega.tipo_producto}[/TIPO_PRODUCTO]
[DESCRIPCION]descripcion de la estructura en 1-2 oraciones[/DESCRIPCION]
[TOTAL_PALABRAS]20000[/TOTAL_PALABRAS]

(Una etiqueta SECCION por cada seccion del producto. Minimo 6, maximo 12.)

[SECCION]
orden=1
tipo=capitulo
pareto=false
palabras=2000
titulo=Titulo de la primera seccion sin comillas
brief=Descripcion de 80-120 palabras de que cubre esta seccion. Sin caracteres especiales. Solo texto plano.
puntos=punto clave uno|punto clave dos|punto clave tres
[/SECCION]

[SECCION]
orden=2
tipo=capitulo
pareto=true
palabras=2500
titulo=Titulo de la segunda seccion
brief=Descripcion de 80-120 palabras. Esta es la seccion mas importante del producto.
puntos=punto uno|punto dos|punto tres|punto cuatro
[/SECCION]

(continua con todas las secciones del producto...)

[BIBLE]
Escribe aqui la Biblia completa del producto (1500-2000 palabras).

IDENTIDAD DEL PRODUCTO: nombre, proposito central, que lo hace unico.
LA GRAN PROMESA: transformacion antes/despues, resultado concreto.
PERFIL DEL AVATAR: quien es, que siente, que quiere, que le preocupa.
EL SISTEMA/METODO: el marco metodologico propio (dale un nombre unico).
VOCABULARIO CLAVE: 8-12 terminos que se usaran consistentemente.
TONO Y ESTILO: como hablar al lector.
LAS 5 VERDADES FUNDAMENTALES: principios que el producto defiende.
EL CAMINO DEL LECTOR: como progresa desde el inicio hasta la transformacion.
[/BIBLE]`

  const raw = await deepseekText(SYSTEM_PROMPT, userContent, 6000)

  const secciones = parseSecciones(raw)
  const bible = extract(raw, 'BIBLE')
  const tipo_producto = extract(raw, 'TIPO_PRODUCTO') || estratega.tipo_producto
  const descripcion = extract(raw, 'DESCRIPCION') || 'Producto digital estructurado en modulos progresivos.'
  const total_palabras = extractInt(raw, 'TOTAL_PALABRAS', 18000)

  return {
    tipo_producto,
    estructura_descripcion: descripcion,
    total_palabras_estimado: total_palabras,
    secciones: secciones.length > 0 ? secciones : generateFallbackSecciones(estratega.tipo_producto),
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
