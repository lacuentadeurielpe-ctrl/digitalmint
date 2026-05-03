import { deepseekJSON } from './deepseek'
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

const SYSTEM_PROMPT = `Eres un estratega de posicionamiento y pricing para productos digitales hispanohablantes.

Aplicas:
- Blue Ocean Strategy: espacio de mercado sin competencia directa
- Semiotica al naming: nombres que evocan transformacion, memorables, unicos (2-3 palabras max)
- Psicologia Kahneman: Sistema 1 (emocional) y Sistema 2 (racional) del comprador
- Ariely: anclaje de precios, precio de referencia, efecto seneuelo
- Principio before->after: el producto promete un cambio visible y prometible

PRECIOS: precio_anchor = 3-5x el principal. precio_downsell = 60-70% del principal.

Responde SOLO con JSON valido. No uses caracteres especiales dentro de los valores de string que rompan el JSON. Devuelve exactamente los campos del schema pedido.`

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

Devuelve este JSON completo:
{
  "nombre_producto": "Nombre Memorable",
  "justificacion_nombre": "explicacion semiotica",
  "subtitulo": "subtitulo de 1 linea que clarifica la propuesta",
  "posicionamiento": "que oceano azul ocupa este producto",
  "promesa_before": "situacion actual dolorosa en primera persona",
  "promesa_after": "situacion futura deseada en primera persona",
  "transformacion_visible": "resultado concreto y medible",
  "avatar": {
    "nombre_ficticio": "Nombre Apellido",
    "edad": "32 anos",
    "ocupacion": "ocupacion especifica",
    "dolores": ["dolor 1", "dolor 2", "dolor 3"],
    "deseos": ["deseo 1", "deseo 2", "deseo 3"],
    "objeciones": ["objecion 1", "objecion 2", "objecion 3"],
    "donde_vive": "plataformas donde esta",
    "nivel_ingresos": "ingresos actuales aproximados",
    "cita_directa": "frase que diria en primera persona"
  },
  "precio_anchor": 297,
  "precio_principal": 97,
  "precio_downsell": 67,
  "justificacion_precio": "por que este precio es correcto",
  "tipo_producto": "curso online"
}`

  return deepseekJSON<EstrategaOutput>(SYSTEM_PROMPT, userContent, 3000)
}
