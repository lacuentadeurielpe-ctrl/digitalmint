import { deepseekText } from './deepseek'
import type { InvestigadorOutput } from './investigador'

export interface EstrategaOutput {
  nombre_producto: string
  justificacion_nombre: string
  titulos_alternativos: string[]
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

const SYSTEM_PROMPT = `Eres un estratega de posicionamiento y copywriter experto en productos digitales hispanohablantes.
Tu especialidad principal es crear TITULOS QUE VENDEN — no titulos descriptivos ni genericos, sino
titulos que generan urgencia, curiosidad y la reaccion inmediata: "esto es exactamente lo que necesito".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS ABSOLUTAS DEL TITULO VENDIBLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ESPECIFICIDAD CONCRETA: siempre incluye numeros, tiempos o resultados medibles.
   ❌ NUNCA: "Guia de Marketing Digital" / "Curso de Fotografía" / "Ebook de Finanzas"
   ✅ SIEMPRE: "Cómo conseguir 3 clientes en 30 dias sin experiencia previa ni cartera de proyectos"

2. FORMULAS PROBADAS — elige la que mejor encaje con el dolor del cliente:
   · "Cómo [RESULTADO EXACTO] sin [OBSTACULO QUE TODOS TEMEN]"
   · "El metodo de [N] pasos para [RESULTADO] aunque [OBJECION COMUN]"
   · "De [SITUACION ACTUAL DOLOROSA] a [SITUACION DESEADA] — El sistema exacto"
   · "[RESULTADO CONCRETO] en [TIEMPO ESPECIFICO]: La guia que [AUDIENCIA] no sabia que existia"
   · "[NOMBRE EVOCADOR]: El camino mas corto de [DOLOR] a [TRANSFORMACION]"

3. CURIOSITY GAP: el titulo debe provocar la pregunta "¿cómo es eso posible?"
   Insinua un secreto o camino no obvio. No revela todo — genera intriga.

4. LENGUAJE EMOCIONAL DEL CLIENTE: usa exactamente las palabras que ellos usarian para
   describir su problema, no el lenguaje academico o tecnico del creador.

5. TRANSFORMACION VISIBLE: el titulo debe implicar un cambio de estado claro.
   El lector debe verse a si mismo DESPUES de tener este producto.

REGLA INVIOLABLE: si el titulo puede describir cualquier otro producto del mismo tema,
es demasiado generico — rechazalo y crea uno mas especifico.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OTROS PRINCIPIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Blue Ocean: busca el angulo de mercado sin competencia directa
- Kahneman: activa Sistema 1 (emocion) primero, System 2 (razon) segundo
- Ariely: precio_anchor = 3-5x el principal; precio_downsell = 60-70% del principal
- Promesa before->after: el producto promete un cambio visible y prometible

Devuelve UNICAMENTE el formato de etiquetas indicado, sin texto adicional, sin explicaciones, sin markdown.`

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
- JTBD (trabajo que contrata el cliente): ${investigador.jtbd}

INSTRUCCION CRITICA PARA LOS TITULOS:
Genera 3 titulos completamente diferentes entre si, cada uno usando una formula distinta.
Todos deben ser especificos, emocionalmente resonantes y prometer una transformacion concreta.
NUNCA uses titulos genericos como "[Tema] para Principiantes" o "La Guia Completa de [Tema]".

Devuelve EXACTAMENTE en este formato (sin texto extra, solo las etiquetas):

[NOMBRE]escribe aqui el titulo mas vendible usando una de las formulas probadas[/NOMBRE]
[NOMBRE_ALT_1]segunda opcion de titulo, formula diferente (p.ej. Cómo X sin Y)[/NOMBRE_ALT_1]
[NOMBRE_ALT_2]tercera opcion, angulo diferente, quizas mas emocional o con numero especifico[/NOMBRE_ALT_2]
[JUSTIFICACION_NOMBRE]por que el titulo principal activa la compra — que mecanismo psicologico usa[/JUSTIFICACION_NOMBRE]
[SUBTITULO]subtitulo que completa la promesa y especifica la audiencia y el resultado, max 15 palabras[/SUBTITULO]
[POSICIONAMIENTO]que oceano azul ocupa este producto vs competencia[/POSICIONAMIENTO]
[BEFORE]situacion actual dolorosa en primera persona del cliente, especifica y emocional[/BEFORE]
[AFTER]situacion futura deseada en primera persona, concreta con resultado visible[/AFTER]
[TRANSFORMACION]resultado concreto y medible que obtiene el cliente al completar el producto[/TRANSFORMACION]
[AVATAR_NOMBRE]Nombre Apellido ficticio[/AVATAR_NOMBRE]
[AVATAR_EDAD]32 anos[/AVATAR_EDAD]
[AVATAR_OCUPACION]ocupacion especifica[/AVATAR_OCUPACION]
[AVATAR_INGRESOS]ingresos actuales aproximados[/AVATAR_INGRESOS]
[AVATAR_DONDE]plataformas donde pasa su tiempo[/AVATAR_DONDE]
[AVATAR_FRASE]frase exacta que diria en primera persona sobre su problema mas profundo[/AVATAR_FRASE]
[AVATAR_DOLORES]dolor especifico uno|dolor especifico dos|dolor especifico tres[/AVATAR_DOLORES]
[AVATAR_DESEOS]deseo uno|deseo dos|deseo tres[/AVATAR_DESEOS]
[AVATAR_OBJECIONES]objecion uno|objecion dos|objecion tres[/AVATAR_OBJECIONES]
[PRECIO_ANCHOR]297[/PRECIO_ANCHOR]
[PRECIO_PRINCIPAL]97[/PRECIO_PRINCIPAL]
[PRECIO_DOWNSELL]67[/PRECIO_DOWNSELL]
[JUSTIFICACION_PRECIO]por que este precio es correcto para esta audiencia y este dolor[/JUSTIFICACION_PRECIO]
[TIPO_PRODUCTO]curso online[/TIPO_PRODUCTO]`

  const raw = await deepseekText(SYSTEM_PROMPT, userContent, 2500)

  const stripPrefix = (s: string) =>
    s.replace(/^t[íi]tulo\s+(principal|alternativo|\d+)\s*:\s*/i, '').trim()

  const nombre = stripPrefix(extract(raw, 'NOMBRE') || `Cómo resolver ${idea.slice(0, 40)} paso a paso`)
  const alt1   = stripPrefix(extract(raw, 'NOMBRE_ALT_1'))
  const alt2   = stripPrefix(extract(raw, 'NOMBRE_ALT_2'))
  const tipo   = extract(raw, 'TIPO_PRODUCTO') || 'curso online'

  return {
    nombre_producto: nombre,
    titulos_alternativos: [alt1, alt2].filter(Boolean),
    justificacion_nombre: extract(raw, 'JUSTIFICACION_NOMBRE') || 'Titulo estrategico orientado a la transformacion',
    subtitulo: extract(raw, 'SUBTITULO') || `La guia exacta para ${idea.slice(0, 50)}`,
    posicionamiento: extract(raw, 'POSICIONAMIENTO') || 'Producto unico en su categoria',
    promesa_before: extract(raw, 'BEFORE') || 'Situacion actual con el problema sin resolver',
    promesa_after: extract(raw, 'AFTER') || 'Situacion futura con el problema resuelto y resultados visibles',
    transformacion_visible: extract(raw, 'TRANSFORMACION') || 'Resultado concreto al completar el producto',
    avatar: {
      nombre_ficticio: extract(raw, 'AVATAR_NOMBRE') || 'Maria Lopez',
      edad: extract(raw, 'AVATAR_EDAD') || '32 anos',
      ocupacion: extract(raw, 'AVATAR_OCUPACION') || investigador.audiencia.ocupacion || 'Profesional independiente',
      dolores: extractList(raw, 'AVATAR_DOLORES').length
        ? extractList(raw, 'AVATAR_DOLORES')
        : investigador.dolores_secundarios.slice(0, 3),
      deseos: extractList(raw, 'AVATAR_DESEOS').length
        ? extractList(raw, 'AVATAR_DESEOS')
        : ['Lograr resultados rapidos', 'Ganar confianza', 'Ser reconocido'],
      objeciones: extractList(raw, 'AVATAR_OBJECIONES').length
        ? extractList(raw, 'AVATAR_OBJECIONES')
        : ['No tengo tiempo', 'Es muy caro', 'No se si funciona para mi'],
      donde_vive: extract(raw, 'AVATAR_DONDE') || 'Instagram, YouTube, grupos de Facebook',
      nivel_ingresos: extract(raw, 'AVATAR_INGRESOS') || investigador.audiencia.nivel_ingresos || '$500-1500/mes',
      cita_directa: extract(raw, 'AVATAR_FRASE') || `Quisiera resolver ${investigador.dolor_principal} pero no se por donde empezar`,
    },
    precio_anchor:    extractInt(raw, 'PRECIO_ANCHOR', 297),
    precio_principal: extractInt(raw, 'PRECIO_PRINCIPAL', 97),
    precio_downsell:  extractInt(raw, 'PRECIO_DOWNSELL', 67),
    justificacion_precio: extract(raw, 'JUSTIFICACION_PRECIO') || 'Precio accesible para la audiencia objetivo',
    tipo_producto: tipo,
  }
}
