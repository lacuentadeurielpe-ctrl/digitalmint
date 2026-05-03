import { deepseekText } from './deepseek'
import type { InvestigadorOutput } from './investigador'

export interface EstrategaOutput {
  nombre_producto: string
  justificacion_nombre: string
  subtitulo: string
  posicionamiento: string
  promesa_before: string
  promesa_after: string
  transformacion_visible: string
  avatar: {
    nombre_ficticio: string
    edad: string
    ocupacion: string
    dolores: string[]
    deseos: string[]
    objeciones: string[]
    donde_vive: string
    nivel_ingresos: string
    cita_directa: string
  }
  precio_anchor: number
  precio_principal: number
  precio_downsell: number
  justificacion_precio: string
  tipo_producto: string
}

function extract(raw: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
  const match = raw.match(regex)
  return match ? match[1].trim() : ''
}

function extractList(raw: string, tag: string): string[] {
  const val = extract(raw, tag)
  if (!val) return []
  return val.split('|').map(s => s.trim()).filter(Boolean)
}

function extractInt(raw: string, tag: string, fallback: number): number {
  const val = extract(raw, tag)
  const n = parseInt(val.replace(/\D/g, ''), 10)
  return isNaN(n) ? fallback : n
}

const SYSTEM_PROMPT = `Eres un estratega de posicionamiento y pricing para productos digitales hispanohablantes.

Aplicas:
- Blue Ocean Strategy: espacio de mercado sin competencia directa
- Semiotica al naming: nombres que evocan transformacion, memorables, unicos (2-3 palabras max)
- Psicologia Kahneman: Sistema 1 (emocional) y Sistema 2 (racional) del comprador
- Ariely: anclaje de precios, precio de referencia
- Principio before->after: el producto promete un cambio visible y prometible

PRECIOS: precio_anchor = 3-5x el principal. precio_downsell = 60-70% del principal.

Devuelve UNICAMENTE el formato de etiquetas indicado, sin ningun texto adicional, sin explicaciones, sin markdown.`

export async function runEstrateга(
  idea: string,
  investigador: InvestigadorOutput
): Promise<EstrategaOutput> {
  const userContent = `Idea original: "${idea}"

Investigacion de mercado:
- Mercado: ${investigador.mercado}
- Dolor principal: ${investigador.dolor_principal}
- Dolores secundarios: ${investigador.dolores_secundarios.join(', ')}
- Audiencia: ${investigador.audiencia.descripcion}
- Edad: ${investigador.audiencia.edad_rango}, Ocupacion: ${investigador.audiencia.ocupacion}
- Nivel ingresos: ${investigador.audiencia.nivel_ingresos}
- Diferenciadores posibles: ${investigador.diferenciadores_posibles.join(', ')}
- JTBD: ${investigador.jtbd}

Devuelve EXACTAMENTE en este formato (sin texto extra, solo las etiquetas):

[NOMBRE]Nombre Memorable del Producto[/NOMBRE]
[JUSTIFICACION_NOMBRE]por que este nombre funciona semanticamente[/JUSTIFICACION_NOMBRE]
[SUBTITULO]subtitulo de una linea que clarifica la propuesta[/SUBTITULO]
[POSICIONAMIENTO]que oceano azul ocupa este producto[/POSICIONAMIENTO]
[BEFORE]situacion actual dolorosa en primera persona[/BEFORE]
[AFTER]situacion futura deseada en primera persona[/AFTER]
[TRANSFORMACION]resultado concreto y medible que obtiene el cliente[/TRANSFORMACION]
[AVATAR_NOMBRE]Nombre Apellido ficticio[/AVATAR_NOMBRE]
[AVATAR_EDAD]32 anos[/AVATAR_EDAD]
[AVATAR_OCUPACION]ocupacion especifica[/AVATAR_OCUPACION]
[AVATAR_INGRESOS]ingresos actuales aproximados[/AVATAR_INGRESOS]
[AVATAR_DONDE]plataformas donde pasa su tiempo[/AVATAR_DONDE]
[AVATAR_FRASE]frase que diria en primera persona sobre su problema[/AVATAR_FRASE]
[AVATAR_DOLORES]dolor uno|dolor dos|dolor tres[/AVATAR_DOLORES]
[AVATAR_DESEOS]deseo uno|deseo dos|deseo tres[/AVATAR_DESEOS]
[AVATAR_OBJECIONES]objecion uno|objecion dos|objecion tres[/AVATAR_OBJECIONES]
[PRECIO_ANCHOR]297[/PRECIO_ANCHOR]
[PRECIO_PRINCIPAL]97[/PRECIO_PRINCIPAL]
[PRECIO_DOWNSELL]67[/PRECIO_DOWNSELL]
[JUSTIFICACION_PRECIO]por que este precio es correcto para esta audiencia[/JUSTIFICACION_PRECIO]
[TIPO_PRODUCTO]curso online[/TIPO_PRODUCTO]`

  const raw = await deepseekText(SYSTEM_PROMPT, userContent, 2000)

  const nombre = extract(raw, 'NOMBRE') || `Producto sobre ${idea.slice(0, 40)}`
  const tipo = extract(raw, 'TIPO_PRODUCTO') || 'curso online'

  return {
    nombre_producto: nombre,
    justificacion_nombre: extract(raw, 'JUSTIFICACION_NOMBRE') || 'Nombre estrategico para el mercado objetivo',
    subtitulo: extract(raw, 'SUBTITULO') || `Tu guia completa para ${idea.slice(0, 50)}`,
    posicionamiento: extract(raw, 'POSICIONAMIENTO') || 'Producto unico en su categoria',
    promesa_before: extract(raw, 'BEFORE') || 'Situacion actual con el problema sin resolver',
    promesa_after: extract(raw, 'AFTER') || 'Situacion futura con el problema resuelto',
    transformacion_visible: extract(raw, 'TRANSFORMACION') || 'Resultado concreto al completar el producto',
    avatar: {
      nombre_ficticio: extract(raw, 'AVATAR_NOMBRE') || 'Maria Lopez',
      edad: extract(raw, 'AVATAR_EDAD') || '32 anos',
      ocupacion: extract(raw, 'AVATAR_OCUPACION') || investigador.audiencia.ocupacion || 'Profesional independiente',
      dolores: extractList(raw, 'AVATAR_DOLORES').length ? extractList(raw, 'AVATAR_DOLORES') : investigador.dolores_secundarios.slice(0, 3),
      deseos: extractList(raw, 'AVATAR_DESEOS').length ? extractList(raw, 'AVATAR_DESEOS') : ['Lograr resultados rapidos', 'Ganar confianza', 'Ser reconocido'],
      objeciones: extractList(raw, 'AVATAR_OBJECIONES').length ? extractList(raw, 'AVATAR_OBJECIONES') : ['No tengo tiempo', 'Es muy caro', 'No se si funciona para mi'],
      donde_vive: extract(raw, 'AVATAR_DONDE') || 'Instagram, YouTube, grupos de Facebook',
      nivel_ingresos: extract(raw, 'AVATAR_INGRESOS') || investigador.audiencia.nivel_ingresos || '$500-1500/mes',
      cita_directa: extract(raw, 'AVATAR_FRASE') || `Quisiera resolver ${investigador.dolor_principal} pero no se por donde empezar`,
    },
    precio_anchor: extractInt(raw, 'PRECIO_ANCHOR', 297),
    precio_principal: extractInt(raw, 'PRECIO_PRINCIPAL', 97),
    precio_downsell: extractInt(raw, 'PRECIO_DOWNSELL', 67),
    justificacion_precio: extract(raw, 'JUSTIFICACION_PRECIO') || 'Precio accesible para la audiencia objetivo',
    tipo_producto: tipo,
  }
}
